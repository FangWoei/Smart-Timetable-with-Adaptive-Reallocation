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

  getTimetable: () => request("/timetable"),
  getRuns: () => request("/runs"),
  generate: (engine = "engine_v2") =>
    request(`/timetable/generate?engine=${engine}`, { method: "POST" }),
  check: (entries) =>
    request("/timetable/check", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
};

const TONE_KEYS = ["blue", "green", "amber", "purple", "teal", "rose", "gold"];

function toneFor(code) {
  const n = [...code].reduce((a, c) => a + c.charCodeAt(0), 0);
  return TONE_KEYS[n % TONE_KEYS.length];
}

/** Convert the API timetable into the shape TimetableGrid expects. */
export function toGridGroups(timetable, counts = {}) {
  const byGroup = new Map();

  for (const e of timetable.entries ?? []) {
    for (const g of e.groups) {
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push({
        code: e.class_code,
        module: e.module,
        day: e.day - 1, // API is 1-5, grid is 0-4
        period: e.start_slot, // API is 1-10, grid period 1-10
        span: e.hours,
        room: e.room,
        lecturer: e.lecturer,
        tone: toneFor(e.class_code),
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
