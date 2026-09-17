import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient, GEMINI_TEXT_MODEL, withRetry, describeGeminiError } from "@/lib/ai/geminiClient";

export const runtime = "nodejs";

const SECTORS = [
  "Manufacturing",
  "Hospitality",
  "F&B",
  "Retail",
  "Office/Professional Services",
  "Healthcare",
  "Logistics",
  "Data Centre",
  "Other",
];

const fieldSchema = (valueType: Type) => ({
  type: Type.OBJECT,
  nullable: true,
  properties: {
    value: { type: valueType },
    source: { type: Type.STRING, enum: ["stated", "estimated"] },
  },
  required: ["value", "source"],
});

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    companyName: fieldSchema(Type.STRING),
    sector: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        value: { type: Type.STRING, enum: SECTORS },
        source: { type: Type.STRING, enum: ["stated", "estimated"] },
      },
      required: ["value", "source"],
    },
    employeeCount: fieldSchema(Type.NUMBER),
    floorAreaM2: fieldSchema(Type.NUMBER),
    numberOfSites: fieldSchema(Type.NUMBER),
    hasVehicles: fieldSchema(Type.BOOLEAN),
    hasSolar: fieldSchema(Type.BOOLEAN),
    hasRefrigerants: fieldSchema(Type.BOOLEAN),
    monthlyElectricityKwh: fieldSchema(Type.NUMBER),
    notes: { type: Type.STRING, nullable: true },
  },
};

const SYSTEM_INSTRUCTION = `You extract a Singapore business profile from a free-text description for a carbon/energy savings calculator.

Rules (do not break these):
- Only extract a field if the text states it directly, or it is a very safe, explicit inference (e.g. "200-person office" -> employeeCount=200, sector=Office/Professional Services).
- Mark a field "source":"stated" only if the number/fact was literally given. Mark it "source":"estimated" if you inferred it (e.g. guessing floor area from employee count, or guessing sector from an industry description without the word being used).
- NEVER invent a kWh, S$, or emissions figure that was not mentioned or clearly implied. If energy use isn't mentioned, omit monthlyElectricityKwh entirely — do not guess a number.
- sector must be exactly one of: ${SECTORS.join(", ")}.
- Omit any field you are not reasonably confident about — omitting is always safer than guessing.
- You are never calculating emissions, costs, or savings. You are only pre-filling descriptive form fields for the user to review and correct.`;

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Text too long (max 2000 characters)" }, { status: 400 });
  }

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: text,
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
    console.error("extract-profile failed:", err);
    const message = describeGeminiError(err, "AI extraction failed. You can fill the form manually instead.");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
