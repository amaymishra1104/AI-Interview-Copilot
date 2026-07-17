// Lightweight global toast — no context, no Redux, just events

const listeners = new Set();

let _id = 0;

function show(msg, type = "info", duration = 3500) {
  const id = ++_id;
  listeners.forEach(fn => fn({ id, msg, type, duration }));
  return id;
}

export const toast = {
  success: (msg, d)   => show(msg, "success", d ?? 3000),
  error:   (msg, d)   => show(msg, "error",   d ?? 5000),
  info:    (msg, d)   => show(msg, "info",     d ?? 3500),
};

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
