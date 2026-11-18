// Light / dark mode. The choice is kept in localStorage; with no saved choice
// the computer's own setting (light or dark) is used. The page colours come
// from CSS variables in index.css that change when <html data-theme="dark">.
import { useSyncExternalStore } from "react";

const KEY = "star.theme";
const listeners = new Set();

function saved() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null; // storage blocked: just follow the system setting
  }
}

function systemTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

let current = saved() ?? systemTheme();

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

/** Call once before the first render (see main.jsx). */
export function initTheme() {
  apply(current);
}

export function setTheme(theme) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* not saved, still works for this visit */
  }
  listeners.forEach((l) => l());
}

export const toggleTheme = () =>
  setTheme(current === "dark" ? "light" : "dark");

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  return useSyncExternalStore(subscribe, () => current);
}
