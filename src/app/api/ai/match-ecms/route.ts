import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient, GEMINI_TEXT_MODEL, withRetry, describeGeminiError } from "@/lib/ai/geminiClient";

export const runtime = "nodejs";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "The catalog measure id this text corresponds to — must be exactly one of the ids given in candidates." },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          reasoning: { type: Type.STRING, description: "One short clause: what in the text justifies this match." },
        },
        required: ["id", "confidence", "reasoning"],
      },
      description: "Catalog measures the free text clearly corresponds to. Empty array if nothing matches well.",
    },
  },
  required: ["matches"],
};

const SYSTEM_INSTRUCTION = `A business has typed free text describing energy-efficiency measures it already has in place. You match that text against a fixed catalog of measure ids/labels for a decarbonisation calculator. Every suggestion you return is reviewed by the user and only takes effect if they manually click "Add" — nothing here is applied automatically. Because of that human check, your job is to surface anything plausibly relevant, including loose keyword- or equipment-level connections, and let the user's own judgment decide whether it truly applies. Here, a missed plausible connection is worse than a low-confidence one — the user can reject a bad suggestion in one click, but will never think to look for a measure you silently omitted.

Rules (do not break these):
- Surface a catalog measure whenever the text shares a keyword, piece of equipment, or general system/domain with it — even if the text doesn't describe the specific mechanism (e.g. "hvac" or "chiller" alone should surface relevant HVAC/chiller measures like "Chiller plant optimization" or "BMS-based scheduling & setpoint optimization", flagged as low confidence so the user knows to verify it). A bare product/brand name (e.g. "we have a Siemens BMS installed") should likewise surface the related measure at low confidence, not be omitted.
- confidence "high" = the text clearly and specifically describes that measure's actual mechanism already being in place; "medium" = a reasonable inference from the text; "low" = only a keyword/equipment/category-level connection — flag it for the user to verify, don't omit it.
- Only omit a catalog id entirely if the text has no plausible keyword, equipment, or domain connection to it at all.
- Never match purely on sector or industry (e.g. "we're a restaurant" alone shouldn't match every kitchen measure) — the text must reference the equipment, system, or category the measure concerns.
- Return at most one match per catalog id, and never invent an id that isn't in candidates.`;

interface Candidate {
  id: string;
  label: string;
}

export async function POST(req: Request) {
  let body: { text?: string; candidates?: Candidate[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  const candidates = body.candidates;
  if (!text) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: "Text too long (max 1000 characters)" }, { status: 400 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: "Missing 'candidates'" }, { status: 400 });
  }

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: JSON.stringify({ text, candidates }),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      })
    );

    const raw = response.text;
    if (!raw) {
      return NextResponse.json({ error: "AI returned an empty response" }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as { matches: { id: string; confidence: string; reasoning: string }[] };
    // Belt-and-braces: drop anything the model invented that isn't actually a candidate id.
    const validIds = new Set(candidates.map((c) => c.id));
    parsed.matches = parsed.matches.filter((m) => validIds.has(m.id));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("match-ecms failed:", err);
    const message = describeGeminiError(err, "Could not match measures right now — you can still select them manually above.");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
