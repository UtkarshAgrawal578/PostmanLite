const SESSION_KEY = "postmanlite:session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "auth.html";
    return null;
  }
  return session;
}
