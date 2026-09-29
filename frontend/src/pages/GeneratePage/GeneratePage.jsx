import { useEffect, useState } from "react";
import { api } from "../api";

export default function GeneratePage() {
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getRuns()
      .then(setRuns)
      .catch((e) => setError(e.message));
  }, []);

  async function handleGenerate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.generate();
      setMessage(
        `Run #${r.run_id}: ${r.status}, penalty ${r.penalty}, ${r.seconds}s, ${r.classes} classes`,
      );
      setRuns(await api.getRuns());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Generate timetable</h2>
        <button
          onClick={handleGenerate}
          disabled={busy}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {busy ? "Generating…" : "Generate"}
        </button>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Past runs</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white text-sm">
            <thead>
              <tr className="text-left">
                {[
                  "Run",
                  "Engine",
                  "Status",
                  "Penalty",
                  "Seconds",
                  "Active",
                  "Created",
                ].map((h) => (
                  <th key={h} className="border border-gray-200 p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="border border-gray-200 p-2">#{r.id}</td>
                  <td className="border border-gray-200 p-2">{r.engine}</td>
                  <td className="border border-gray-200 p-2">{r.status}</td>
                  <td className="border border-gray-200 p-2">{r.penalty}</td>
                  <td className="border border-gray-200 p-2">
                    {r.solve_seconds}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {r.is_active ? "✅" : ""}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
