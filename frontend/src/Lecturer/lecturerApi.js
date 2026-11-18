// Lecturer 自己用的请求（只调 /me/*）。不改共用的 api.js。
// preview=true 时返回假数据，不连后端、不需要登录。
import { getToken } from "../auth/supabase.js";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string" ? detail : `Request failed (${res.status})`,
    );
  }
  return body;
}

const realApi = {
  myTimetable: () => request("/me/timetable"),
  myHours: () => request("/me/hours"),
  myAvailability: () => request("/me/availability"),
  saveMyAvailability: (unavailable) =>
    request("/me/availability", {
      method: "PUT",
      body: JSON.stringify({ unavailable }),
    }),
};

// ---------- 预览用假数据 ----------
const NAME = "Dr Lim Chee Keong";
const e = (id, day, s, t, hours, module, groups, room) => ({
  entry_id: id,
  day,
  start_time: s,
  end_time: t,
  hours,
  module,
  class_code: module,
  groups,
  room,
  lecturer: NAME,
});
const ENTRIES = [
  e(1, 1, "08:30", "10:30", 2, "Business Statistics", ["BA1", "BA2"], "A-201"),
  e(2, 1, "13:30", "15:30", 2, "Microeconomics", ["BA1"], "B-105"),
  e(3, 2, "10:30", "12:30", 2, "Financial Mgmt", ["FN1"], "A-203"),
  e(4, 3, "08:30", "10:30", 2, "Business Statistics", ["BA3"], "A-201"),
  e(5, 3, "14:30", "16:30", 2, "Microeconomics", ["BA2"], "B-105"),
  e(6, 4, "09:30", "11:30", 2, "Financial Mgmt", ["FN2"], "A-204"),
];
let blocked = [[1, 9], [1, 10], [2, 9], [2, 10], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10]];
const later = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 200));
const avail = () => ({ lecturer_id: 1, name: NAME, is_part_time: true, unavailable: blocked });

const mockApi = {
  myTimetable: () => later({ lecturer: NAME, run: 1, entries: ENTRIES }),
  myHours: () =>
    later({
      lecturer: NAME,
      per_day: { 1: 4, 2: 2, 3: 4, 4: 2, 5: 0 },
      per_week: 12,
      per_month: {},
      semester_total: 168,
    }),
  myAvailability: () => later(avail()),
  saveMyAvailability: (u) => {
    blocked = u;
    return later(avail());
  },
};

export const PREVIEW_SEMESTER = { start_date: "2027-01-04", end_date: "2027-04-23", is_active: true };
export const PREVIEW_EMAIL = "lim.ck@peninsulamalaysia.edu.my";
export const makeLecturerApi = (preview) => (preview ? mockApi : realApi);
