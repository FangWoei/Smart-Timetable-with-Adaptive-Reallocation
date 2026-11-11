import { getToken, supabase } from "./auth/supabase.js";


const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Adds the login token to a request, and sends the user back to the login page
// if the server says the session is no longer valid.
async function authedFetch(url, options = {}) {
  const token = await getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) await supabase?.auth.signOut();
  return res;
}

async function request(path, options = {}) {
  const res = await authedFetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
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

  const res = await authedFetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: form,
  });
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
  me: () => request("/me"),

  importPreview: (file) => uploadCsv("/import/preview", file),
  importCommit: (file) => uploadCsv("/import/commit", file),

  getLecturers: () => request("/lecturers"),
  addLecturer: (l) =>
    request("/lecturers", { method: "POST", body: JSON.stringify(l) }),
  setLecturerPartTime: (id, isPartTime) =>
    request(`/lecturers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_part_time: isPartTime }),
    }),
  getLecturerAvailability: (id) => request(`/lecturers/${id}/availability`),
  saveLecturerAvailability: (id, unavailable) =>
    request(`/lecturers/${id}/availability`, {
      method: "PUT",
      body: JSON.stringify({ unavailable }),
    }),
  deleteLecturer: (id) => request(`/lecturers/${id}`, { method: "DELETE" }),

  getGroups: () => request("/groups"),
  getHolidays: (start, end) => request(`/holidays?start=${start}&end=${end}`),
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
    request(`/timetable/generate?engine=${engine}&respect_locks=false`, {
      method: "POST",
    }),
  check: (entries) =>
    request("/timetable/check", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  setLock: (entryId, locked) =>
    request(`/timetable/entries/${entryId}/lock`, {
      method: "POST",
      body: JSON.stringify({ locked }),
    }),
  getRooms: () => request("/rooms"),
  addRoom: (r) =>
    request("/rooms", { method: "POST", body: JSON.stringify(r) }),
  updateRoom: (id, r) =>
    request(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify(r) }),
  setRoomStatus: (id, s) =>
    request(`/rooms/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(s),
    }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: "DELETE" }),
  getClasses: () => request("/classes"),
  updateClass: (id, c) =>
    request(`/classes/${id}`, { method: "PATCH", body: JSON.stringify(c) }),
  getUnplaced: () => request("/timetable/unplaced"),
  autoPlaceAll: () =>
    request("/timetable/unplaced/auto-place", { method: "POST" }),
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

/** One hue per course; sorted codes keep the colours the same on every load. */
function courseHues(entries) {
  const codes = [
    ...new Set(entries.map((e) => e.class_code ?? e.module)),
  ].sort();
  return new Map(
    codes.map((code, i) => [code, Math.round((210 + i * 137.508) % 360)]),
  );
}

// "08:30" -> half-hour slot (slot 1 = 08:30, slot 2 = 09:00 ...)
export function timeToSlot(t) {
  const [h, m] = String(t).split(":").map(Number);
  return Math.round((h * 60 + m - (8 * 60 + 30)) / 30) + 1;
}

/** An entry that already has a day and a start time is on the timetable. */
export function isPlacedEntry(e) {
  return e.day != null && (e.start_time != null || e.start_slot != null);
}

/**
 * GET /timetable -> the shape TimetableGrid expects.
 * An entry has a list of `groups`, so it is added to EVERY group it belongs to.
 * start_time / end_time are used directly for position and length.
 */
export function toGridGroups(timetable, counts = {}) {
  const byGroup = new Map();
  const entries = (timetable.entries ?? []).filter(isPlacedEntry);
  const hues = courseHues(entries);

  for (const e of entries) {
    const code = e.class_code ?? e.module;
    const startSlot =
      e.start_time != null
        ? timeToSlot(e.start_time)
        : ((e.start_slot ?? 1) - 1) * 2 + 1;
    const endSlot =
      e.end_time != null
        ? timeToSlot(e.end_time)
        : startSlot + Math.round((e.hours ?? 1) * 2);

    for (const g of e.groups ?? []) {
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push({
        entryId: e.entry_id ?? e.id,
        sessionId: e.session_id,
        locked: !!e.locked,
        code,
        module: e.module,
        groups: e.groups ?? [],
        day: e.day - 1, // API 1-5 -> grid 0-4
        startTime: e.start_time,
        endTime: e.end_time,
        startSlot, // half-hour slot, used by the grid
        slotSpan: Math.max(1, endSlot - startSlot),
        period: e.start_slot ?? Math.ceil(startSlot / 2), // hourly period, used by drag/drop
        span: e.hours,
        room: e.room,
        lecturer: e.lecturer,
        tone: toneFor(code),
        hue: hues.get(code),
        shared: (e.groups?.length ?? 0) > 1,
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
