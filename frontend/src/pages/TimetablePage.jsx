import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

function slotLabel(slot) {
  const minutes = 8 * 60 + 30 + (slot - 1) * 60;
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default function TimetablePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("");

  useEffect(() => {
    api
      .getTimetable()
      .then((d) => {
        setData(d);
        setGroup(d.entries[0]?.group ?? "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const groups = useMemo(
    () => [...new Set((data?.entries ?? []).map((e) => e.group))].sort(),
    [data],
  );

  // Which class starts in each cell, and which cells are covered by a longer class
  const cells = useMemo(() => {
    const starts = {};
    const covered = new Set();
    for (const e of data?.entries ?? []) {
      if (e.group !== group) continue;
      starts[`${e.day}-${e.start_slot}`] = e;
      for (let s = e.start_slot + 1; s < e.start_slot + e.hours; s++) {
        covered.add(`${e.day}-${s}`);
      }
    }
    return { starts, covered };
  }, [data, group]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Timetable</h2>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm">
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          Run #{data.run.id} · penalty {data.run.penalty}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse bg-white text-sm">
          <thead>
            <tr>
              <th className="w-20 border border-gray-200 p-2">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="border border-gray-200 p-2">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot}>
                <td className="border border-gray-200 p-2 text-gray-500">
                  {slotLabel(slot)}
                </td>
                {DAYS.map((_, i) => {
                  const key = `${i + 1}-${slot}`;
                  if (cells.covered.has(key)) return null;
                  const e = cells.starts[key];
                  if (!e) {
                    return (
                      <td key={key} className="h-12 border border-gray-200" />
                    );
                  }
                  return (
                    <td
                      key={key}
                      rowSpan={e.hours}
                      className="border border-gray-200 bg-blue-50 p-2 align-top">
                      <div className="font-medium">{e.module}</div>
                      <div className="text-xs text-gray-600">
                        {e.room} · {e.lecturer ?? "Unassigned"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {e.start_time}–{e.end_time}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
