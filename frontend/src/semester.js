// The semester dates (set on the Import page) shared by every page that shows them.
import { useSyncExternalStore } from "react";
import { api } from "./api.js";

let current = null;
let holidays = [];
const listeners = new Set();

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setSemester(s, hols = holidays) {
  current = s;
  holidays = hols;
  listeners.forEach((l) => l());
}

/** Read the active semester from the backend. Never throws. */
export async function refreshSemester() {
  try {
    const list = await api.getSemesters();
    const active = list.find((x) => x.is_active) ?? null;
    const hols = active
      ? await api.getHolidays(active.start_date, active.end_date)
      : [];
    setSemester(active, hols);
  } catch {
    /* keep what we had */
  }
}

/** The active semester ({start_date, end_date, ...}) or null. */
export const useSemester = () => useSyncExternalStore(subscribe, () => current);

/** Holidays that fall inside the semester dates (new array only when something changed). */
export const useHolidays = () =>
  useSyncExternalStore(subscribe, () => holidays);

/** 2027-01-04 -> 04/01/2027 */
export function dmy(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
