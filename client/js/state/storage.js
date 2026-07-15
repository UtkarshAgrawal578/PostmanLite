// All localStorage access goes through here — namespaced keys so
// nothing collides, and JSON parse/stringify handled in one place.

const PREFIX = "postmanlite:";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error("localStorage write failed:", err);
  }
}

// ---- Collections: [{ id, name, requests: [...] }] ----
export function getCollections() {
  return read("collections", []);
}
export function saveCollections(collections) {
  write("collections", collections);
}

// ---- Environments: [{ id, name, variables: { KEY: value } }] ----
export function getEnvironments() {
  return read("environments", []);
}
export function saveEnvironments(envs) {
  write("environments", envs);
}

// ---- Active environment id ----
export function getActiveEnvId() {
  return read("activeEnv", null);
}
export function saveActiveEnvId(id) {
  write("activeEnv", id);
}

// ---- History: [{ id, method, url, status, time, timestamp, requestSnapshot }] ----
const MAX_HISTORY = 30;

export function getHistory() {
  return read("history", []);
}
export function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry); // newest first
  write("history", history.slice(0, MAX_HISTORY));
}
export function clearHistory() {
  write("history", []);
}
