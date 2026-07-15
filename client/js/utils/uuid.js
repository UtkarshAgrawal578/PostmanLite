// Small, dependency-free unique id generator — good enough for
// collections/requests/history entries in localStorage.
export function uuid(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}
