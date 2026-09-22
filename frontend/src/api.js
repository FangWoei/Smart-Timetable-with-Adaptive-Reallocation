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

export const api = {
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
