import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EDITABLE_FIELDS, ALL_MANAGED_FILES } from "@/lib/adminFields";
import { getByPath, setByPath, bumpPatchVersion, todayIso } from "@/lib/adminDataUtil";

const DATA_DIR = path.join(process.cwd(), "data");

function readFile(file: string) {
  const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw);
}

function writeFile(file: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function appendChangelog(entry: string) {
  const changelogPath = path.join(DATA_DIR, "changelog.md");
  const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, "utf-8") : "# Data changelog\n\n";
  fs.writeFileSync(changelogPath, existing + entry, "utf-8");
}

export async function GET() {
  const files: Record<string, unknown> = {};
  for (const file of ALL_MANAGED_FILES) {
    files[file] = readFile(file);
  }
  const changelogPath = path.join(DATA_DIR, "changelog.md");
  const changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, "utf-8") : "";
  return NextResponse.json({ files, changelog });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { file, field, value, source, justification } = body as {
    file: string;
    field: string;
    value: string | number;
    source: string;
    justification: string;
  };

  if (!ALL_MANAGED_FILES.includes(file)) {
    return NextResponse.json({ error: "Unknown data file." }, { status: 400 });
  }
  const allowed = EDITABLE_FIELDS.find((f) => f.file === file && f.field === field);
  if (!allowed) {
    return NextResponse.json({ error: "That field is not editable through this tool." }, { status: 400 });
  }
  if (!source?.trim() || !justification?.trim()) {
    return NextResponse.json({ error: "Source URL and justification are both required." }, { status: 400 });
  }

  const current = readFile(file);
  const oldValue = getByPath(current, field);
  const parsedValue = allowed.type === "number" ? Number(value) : value;
  if (allowed.type === "number" && Number.isNaN(parsedValue)) {
    return NextResponse.json({ error: "Value must be a number." }, { status: 400 });
  }

  let updated = setByPath(current, field, parsedValue);
  updated = setByPath(updated, "lastUpdated", todayIso());
  updated = setByPath(updated, "version", bumpPatchVersion((current as { version: string }).version ?? "1.0.0"));

  writeFile(file, updated);
  appendChangelog(
    `- ${todayIso()} | ${file} | ${allowed.label}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(parsedValue)} | source: ${source} | note: ${justification}\n`
  );

  return NextResponse.json({ file, updated });
}
