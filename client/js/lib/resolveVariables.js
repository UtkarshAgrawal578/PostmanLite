import { getEnvironments, getActiveEnvId } from "../state/storage.js";

// Replaces every {{VAR_NAME}} occurrence in a string with the matching
// value from the active environment. Unmatched variables are left as-is
// (so the user can see what's still unresolved instead of silently
// getting "undefined" in their URL).
export function resolveVariables(input) {
  if (typeof input !== "string" || input.indexOf("{{") === -1) return input;

  const activeEnvId = getActiveEnvId();
  if (!activeEnvId) return input;

  const envs = getEnvironments();
  const activeEnv = envs.find((e) => e.id === activeEnvId);
  if (!activeEnv) return input;

  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, varName) => {
    const value = activeEnv.variables[varName];
    return value !== undefined ? value : match;
  });
}

// Recursively resolves variables inside an object's string values —
// used for headers and form-data bodies where any value might contain {{VAR}}.
export function resolveVariablesDeep(obj) {
  if (typeof obj === "string") return resolveVariables(obj);
  if (Array.isArray(obj)) return obj.map(resolveVariablesDeep);
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[resolveVariables(key)] = resolveVariablesDeep(value);
    }
    return result;
  }
  return obj;
}
