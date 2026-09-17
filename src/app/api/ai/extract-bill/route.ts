import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient, GEMINI_VISION_MODEL, withRetry, describeGeminiError } from "@/lib/ai/geminiClient";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      enum: [
        "SP Group electricity bill",
        "City Gas bill",
        "Geneco/Keppel Electric bill",
        "Fuel card statement",
        "ACMV maintenance invoice",
        "Unknown",
      ],
    },
    billingPeriodStart: { type: Type.STRING, nullable: true, description: "ISO date, e.g. 2026-08-01" },
    billingPeriodEnd: { type: Type.STRING, nullable: true, description: "ISO date, e.g. 2026-08-31" },
    totalKwh: { type: Type.NUMBER, nullable: true },
    totalAmountSgd: { type: Type.NUMBER, nullable: true },
    impliedTariffSgdPerKwh: { type: Type.NUMBER, nullable: true, description: "totalAmountSgd / totalKwh, only if both are present" },
    extractionNotes: { type: Type.STRING, nullable: true, description: "Anything illegible, ambiguous, or not found" },
  },
  required: ["documentType"],
};

const SYSTEM_INSTRUCTION = `You read a Singapore utility bill, fuel card statement, or ACMV invoice image/PDF and extract only the figures literally printed on it.

Rules (do not break these):
- Extract every field that is legibly printed on the document — kWh, S$ amounts, and dates are all plain transcription, not estimation, so extract all of them whenever they appear. Stripping a currency symbol (e.g. reading "S$5,876.30" as 5876.30) is transcription, not guessing — do it.
- Never estimate, round for convenience, or fill in a "typical" figure for anything not legible or not printed at all.
- If a field truly isn't present or isn't legible anywhere on the document, omit it — do not guess.
- impliedTariffSgdPerKwh should only be filled if you can compute it directly from totalAmountSgd and totalKwh both being present on the document.
- You are not calculating emissions or savings — only transcribing what is printed.`;

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' in form data" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}. Use PDF, PNG, JPEG, or WebP.` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: file.type, data: base64 } },
              { text: "Extract the billing details from this document." },
            ],
          },
        ],
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

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("extract-bill failed:", err);
    const message = describeGeminiError(err, "Bill extraction failed. You can enter the figures manually instead.");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
