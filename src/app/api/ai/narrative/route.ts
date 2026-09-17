import { NextResponse } from "next/server";
import { getGeminiClient, GEMINI_TEXT_MODEL, withRetry, describeGeminiError } from "@/lib/ai/geminiClient";
import type { ResultContext } from "@/lib/ai/resultContext";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You write a 3-4 sentence plain-English summary of a decarbonisation cost/savings illustration for a business owner in Singapore.

Rules (do not break these):
- Use ONLY the numbers given to you in the user message. Never invent, round to a "nicer" figure, or add any number not explicitly given.
- Do not calculate anything — every number you use must be copied from the input, not derived.
- Structure: 1) what the company emits and from where, 2) what deploying the named products could save and by when (payback), 3) the carbon tax / tariff context (only mention tax if isCarbonTaxLiable is true — otherwise note it's NOT a direct taxpayer), 4) one line on the Scope 3 footprint as context only, never as a dollar saving.
- Plain English, no jargon, no bullet points — flowing prose, third person, refer to the company by name.
- Do not use the word "approximately" more than once.`;

export async function POST(req: Request) {
  let context: ResultContext;
  try {
    context = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: JSON.stringify(context),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.3,
        },
      })
    );

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "AI returned an empty response" }, { status: 502 });
    }

    return NextResponse.json({ narrative: text });
  } catch (err) {
    console.error("narrative failed:", err);
    const message = describeGeminiError(err, "Could not generate an AI summary right now.");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
