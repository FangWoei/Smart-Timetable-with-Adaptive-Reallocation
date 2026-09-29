import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import Tabs from "../../components/Tabs.jsx";

const TABS = [
  { id: "bulk", label: "Bulk import" },
  { id: "manual", label: "Add manually" },
];

// const FILE_TYPES = [
//   { id: 'sheet', label: 'Excel / CSV sheet', accept: '.xlsx,.csv', hint: '.xlsx, .csv up to 10 MB' },
//   { id: 'pdf', label: 'PDF class list', accept: '.pdf', hint: '.pdf up to 10 MB' },
// ]

function BulkImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function pick(f) {
    setFile(f ?? null);
    setPreview(null);
    setError("");
    setDone("");
  }

  async function run(action) {
    if (!file) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      if (action === "preview") {
        setPreview(await api.importPreview(file));
      } else {
        const r = await api.importCommit(file);
        setDone(`Imported ${r.classes} classes and ${r.groups} intake groups.`);
        setPreview(null);
        setFile(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-semibold text-ink">Import course listing</h1>
      <p className="mt-1 text-sm text-ink-3">
        Upload the Course Listing CSV. Student names in the file are ignored —
        only the head count per class is read.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-white text-center hover:border-navy-500">
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <>
              <span className="text-sm font-medium text-ink">{file.name}</span>
              <span className="text-xs text-ink-4">
                {(file.size / 1024).toFixed(0)} KB · choose another to replace
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-2">
                Drag a file here, or click to browse
              </span>
              <span className="text-xs text-ink-4">.csv up to 2 MB</span>
              <span className="mt-1 rounded border border-line-strong px-3 py-1 text-[13px] text-ink-2">
                Choose file
              </span>
            </>
          )}
        </label>

        <aside className="rounded-md border border-line bg-white p-4 text-xs text-ink-2">
          <h2 className="text-[13px] font-semibold text-ink">What gets read</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4">
            <li>Intake group, level and head count</li>
            <li>Course code, name and hours per week</li>
            <li>Lecturer name and full-time / part-time</li>
            <li className="text-ink-4">Student names are skipped</li>
          </ul>
        </aside>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-3 text-sm text-green-700">{done}</p>}

      {preview && (
        <div className="mt-6 space-y-4">
          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-[13px] font-semibold text-amber-900">
                Check these with the coordinator
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-800">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-[13px] font-semibold text-ink">
            {preview.classes.length} classes ·{" "}
            {Object.keys(preview.groups).length} intake groups
          </h2>

          <div className="overflow-x-auto rounded-md border border-line bg-white">
            <table className="w-full text-xs">
              <thead className="bg-panel text-left text-ink-2">
                <tr>
                  {[
                    "Code",
                    "Module",
                    "Groups",
                    "Students",
                    "Hours",
                    "Lecturer",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.classes.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{c.id}</td>
                    <td className="px-3 py-2 text-ink-2">{c.module}</td>
                    <td className="px-3 py-2 text-ink-4">
                      {c.groups.join(", ")}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{c.students}</td>
                    <td className="px-3 py-2 text-ink-2">{c.weekly_hours}h</td>
                    <td className="px-3 py-2 text-ink-2">
                      {c.lecturer}
                      {c.part_time && (
                        <span className="ml-1 rounded bg-panel px-1 text-[10px]">
                          PT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.skipped.length > 0 && (
            <p className="text-xs text-ink-4">
              Skipped (not timetabled):{" "}
              {preview.skipped.map((s) => `${s.code} ${s.group}`).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => pick(null)}
          className="h-[30px] rounded border border-line-strong bg-white px-4 text-[13px] text-ink-2 hover:bg-panel">
          Discard
        </button>
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => run(preview ? "commit" : "preview")}
          className="h-[30px] rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Working…" : preview ? "Confirm import" : "Preview"}
        </button>
      </div>
    </div>
  );
}

export default function ImportDataPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "bulk";

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="border-b border-line bg-white px-6 pt-3">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(id) => setParams({ tab: id })}
          label="Import mode"
        />
      </div>
      <div className="p-6">
        {tab === "bulk" ? (
          <BulkImport />
        ) : (
          <div className="mx-auto max-w-4xl rounded-md border border-dashed border-line-strong bg-white p-8 text-center text-xs text-ink-4">
            Add-one-at-a-time form goes here
          </div>
        )}
      </div>
    </div>
  );
}
