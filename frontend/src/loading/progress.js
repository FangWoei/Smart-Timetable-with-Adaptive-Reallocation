// Counts the things the app is waiting for (API calls, page changes) so the
// LoadingBar can show how far along it is. No React in here.
let snapshot = { active: 0, total: 0, done: 0 };
const listeners = new Set();

function set(next) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getSnapshot = () => snapshot;

/** Call when something starts loading. Returns the function to call when it ends. */
export function startTask() {
  // A new batch starts when nothing was loading
  const fresh = snapshot.active === 0;
  set({
    active: snapshot.active + 1,
    total: fresh ? 1 : snapshot.total + 1,
    done: fresh ? 0 : snapshot.done,
  });
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    const active = Math.max(0, snapshot.active - 1);
    set({ active, total: snapshot.total, done: snapshot.done + 1 });
  };
}

/** For page changes: show the bar briefly even when the new page loads nothing. */
export function pulse(ms = 450) {
  const end = startTask();
  setTimeout(end, ms);
}

/** Wrap any promise so the bar follows it. */
export async function track(promise) {
  const end = startTask();
  try {
    return await promise;
  } finally {
    end();
  }
}
