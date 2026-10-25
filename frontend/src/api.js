const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : (detail?.message ?? `Request failed (${res.status})`);
    throw new Error(message);
  }
  return body;
}

async function uploadCsv(path, file) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", body: form });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string" ? detail : `Upload failed (${res.status})`,
    );
  }
  return body;
}

export const api = {
  importPreview: (file) => uploadCsv("/import/preview", file),
  importCommit: (file) => uploadCsv("/import/commit", file),

  getGroups: () => request("/groups"),
  getClasses: () => request("/classes"), // 👈 补全了该方法，解决报错
  getHolidays: (start, end) =>
    request(`/holidays?start=${start}&end=${end}`),
  syncHolidays: (year, state) =>
    request(`/holidays/sync?year=${year}&state=${encodeURIComponent(state)}`, {
      method: "POST",
    }),
  addHoliday: (h) =>
    request("/holidays", { method: "POST", body: JSON.stringify(h) }),
  deleteHoliday: (date) => request(`/holidays/${date}`, { method: "DELETE" }),
  getSemesters: () => request("/semesters"),
  getTimetable: () => request("/timetable"),
  getRuns: () => request("/runs"),
  generate: (engine = "engine_v2") =>
    request(`/timetable/generate?engine=${engine}`, { method: "POST" }),
  check: (entries) =>
    request("/timetable/check", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  updateEntry: (entryId, data) =>
    request(`/timetable/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

const TONE_KEYS = ["blue", "green", "amber", "purple", "teal", "rose", "gold"];

function toneFor(code) {
  const n = [...code].reduce((a, c) => a + c.charCodeAt(0), 0);
  return TONE_KEYS[n % TONE_KEYS.length];
}

function courseHues(entries) {
  const codes = [...new Set(entries.map((e) => e.class_code))].sort();
  return new Map(
    codes.map((code, i) => [code, Math.round((210 + i * 137.508) % 360)]),
  );
}

/** Convert the API timetable into the shape TimetableGrid expects. */
export function toGridGroups(timetable, counts = {}) {
  const byGroup = new Map();
  const hues = courseHues(timetable.entries ?? []);

  for (const e of timetable.entries ?? []) {
    for (const g of e.groups) {
      if (!byGroup.has(g)) byGroup.set(g, []);
      
      const rawStart = e.start_slot || 1;
      const startSlot = Math.round((rawStart - 1) * 2 + 1);
      const slotSpan = Math.round((e.hours || 2) * 2);

      byGroup.get(g).push({
        id: e.id || e.entry_id || `${e.class_code}-${e.day}-${rawStart}`,
        code: e.class_code,
        module: e.module,
        day: e.day - 1, // API is 1-5, grid is 0-4
        startSlot: startSlot,
        slotSpan: slotSpan,
        period: rawStart,
        span: e.hours,
        room: e.room,
        lecturer: e.lecturer,
        tone: toneFor(e.class_code),
        hue: hues.get(e.class_code),
        shared: e.groups.length > 1,
      });
    }
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, lessons]) => ({
      id,
      count: counts[id],
      lessons,
      freeSlots: [],
    }));
}
