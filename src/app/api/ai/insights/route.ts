import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient, GEMINI_TEXT_MODEL, withRetry, describeGeminiError } from "@/lib/ai/geminiClient";
import type { ResultContext } from "@/lib/ai/resultContext";

export const runtime = "nodejs";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          gap: {
            type: Type.STRING,
            description: "The improvement opportunity, stated in plain, vendor-neutral terms — what's suboptimal, not which product fixes it.",
          },
          recommendation: {
            type: Type.STRING,
            description:
              "Which ONE product from productNames addresses this gap and briefly why, in one clause. If no listed product actually addresses this particular gap, give a plain non-product next step instead of forcing a match.",
          },
        },
        required: ["gap", "recommendation"],
      },
      description: "3 to 5 insights, each a {gap, recommendation} pair.",
    },
  },
  required: ["insights"],
};

const SYSTEM_INSTRUCTION = `You write 3-5 "what you can improve" insights for a business owner, based ONLY on the facts given to you. Each insight has two parts: first identify the gap/opportunity in vendor-neutral terms, THEN separately name which recommended product closes it.

Rules (do not break these):
- Every gap must be traceable to a fact in the input (sectorPositionLabel, energySavingRatePct, topWarnings, confidenceLevel, isCarbonTaxLiable, baselineScope3TCo2e). Never invent a number or fact not present in the input.
- The "gap" field must NOT name any product or brand — describe the opportunity itself (e.g. "your energy intensity sits above the sector average" or "your savings estimate has a wide range because it relies on spend-based Scope 3 data").
- The "recommendation" field must only name a product that is already in productNames — you are explaining the existing recommendation, never inventing a new product. If none of the listed products actually address a given gap, say so plainly instead of forcing an irrelevant match.
- If confidenceLevel is Low or Medium, include one insight about what data would narrow the range (drawing only on topWarnings if relevant).
- If isCarbonTaxLiable is false, do not suggest carbon-tax-reduction actions — reframe around the energy-tariff saving instead.
- Each field is one plain-English sentence, specific and actionable, not generic ("consider sustainability" is not acceptable).
- No numbers beyond ones already given in the input.`;

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
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.3,
        },
      })
    );

    const raw = response.text;
    if (!raw) {
      return NextResponse.json({ error: "AI returned an empty response" }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("insights failed:", err);
    const message = describeGeminiError(err, "Could not generate AI insights right now.");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
