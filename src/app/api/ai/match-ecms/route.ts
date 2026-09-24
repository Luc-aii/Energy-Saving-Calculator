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

const SYSTEM_INSTRUCTION = `A business has typed free text describing energy-efficiency measures it already has in place. You match that text against a fixed catalog of measure ids/labels for a decarbonisation calculator — this decides which measures get EXCLUDED from that company's savings-opportunity recommendations, so a wrong match would wrongly hide a real opportunity from them.

Rules (do not break these):
- Only return a candidate id if the text describes something that clearly, substantively corresponds to that catalog measure's actual mechanism — not just an adjacent or vaguely-related term.
- A bare product/brand name is NOT enough on its own (e.g. "we have a Siemens BMS installed" does not by itself justify "BMS-based scheduling & setpoint optimization" — that specifically requires scheduling/setpoint optimization to be active, not just a BMS existing). Only match if the described capability is actually implied.
- Never match on sector or industry alone — the text must describe the measure itself.
- If genuinely uncertain, omit the match rather than guessing — a missed match is far less harmful than a wrong one here, since the user reviews and confirms every suggestion before it's applied.
- confidence "high" = the text is essentially unambiguous; "medium" = a reasonable but not certain inference; "low" = a plausible guess the user should scrutinize closely.
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
