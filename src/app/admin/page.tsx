"use client";

import { useEffect, useState } from "react";
import { EDITABLE_FIELDS, READ_ONLY_FILES } from "@/lib/adminFields";
import { getByPath } from "@/lib/adminDataUtil";

type FilesMap = Record<string, Record<string, unknown> & { version?: string; lastUpdated?: string; source?: string }>;

export default function AdminPage() {
  const [files, setFiles] = useState<FilesMap | null>(null);
  const [changelog, setChangelog] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formJustification, setFormJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.files);
        setChangelog(data.changelog);
      });
  };

  useEffect(load, []);

  const startEdit = (fileFieldKey: string, currentValue: unknown) => {
    setEditingKey(fileFieldKey);
    setFormValue(String(currentValue ?? ""));
    setFormSource("");
    setFormJustification("");
    setError(null);
  };

  const save = async (file: string, field: string) => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, field, value: formValue, source: formSource, justification: formJustification }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Save failed.");
      return;
    }
    setEditingKey(null);
    load();
  };

  const downloadCsv = () => {
    if (!files) return;
    const rows = [["file", "field", "label", "value", "file_version", "file_lastUpdated"]];
    for (const f of EDITABLE_FIELDS) {
      const doc = files[f.file];
      rows.push([f.file, f.field, f.label, String(getByPath(doc, f.field) ?? ""), doc?.version ?? "", doc?.lastUpdated ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peak-calculator-factors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!files) return <div className="p-6 text-sm text-zinc-500">Loading...</div>;

  const byFile = EDITABLE_FIELDS.reduce<Record<string, typeof EDITABLE_FIELDS>>((acc, f) => {
    (acc[f.file] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Data Admin</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            PRD section 16.5 — edit factors with a required source + justification. In dev this hot-reloads immediately; in a
            production build these files are bundled at build time, so a change here still needs a redeploy to reach users.
          </p>
        </div>
        <button onClick={downloadCsv} className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
          Download factor set (CSV)
        </button>
      </div>

      {Object.entries(byFile).map(([file, fields]) => (
        <div key={file} className="mb-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{file}</h2>
            <span className="text-[10px] text-zinc-400">
              v{files[file]?.version} — updated {files[file]?.lastUpdated}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((f) => {
              const key = `${f.file}::${f.field}`;
              const currentValue = getByPath(files[file], f.field);
              return (
                <div key={key} className="flex flex-col gap-1 border-t border-zinc-100 pt-2 text-sm dark:border-zinc-900 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{String(currentValue)}</span>
                      <button
                        className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                        onClick={() => startEdit(key, currentValue)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  {editingKey === key && (
                    <div className="flex flex-col gap-1.5 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900">
                      <input
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        placeholder="New value"
                      />
                      <input
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                        value={formSource}
                        onChange={(e) => setFormSource(e.target.value)}
                        placeholder="Source URL (required)"
                      />
                      <input
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                        value={formJustification}
                        onChange={(e) => setFormJustification(e.target.value)}
                        placeholder="Justification (required)"
                      />
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex gap-2">
                        <button
                          disabled={saving}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                          onClick={() => save(f.file, f.field)}
                        >
                          {saving ? "Saving..." : "Publish change"}
                        </button>
                        <button className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700" onClick={() => setEditingKey(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Read-only (needs sign-off elsewhere)</h2>
        <ul className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          {READ_ONLY_FILES.map((r) => (
            <li key={r.file}>
              <span className="font-mono">{r.file}</span> — {r.reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Changelog</h2>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">{changelog}</pre>
      </div>
    </div>
  );
}
