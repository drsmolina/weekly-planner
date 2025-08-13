export const STORAGE_KEY = "planner:data:v2_halfhours";
export const STORAGE_TEMPLATE_KEY = "planner:baseTemplate:v2_halfhours";
export const STORAGE_AUTOSEED_KEY = "planner:autoSeed:v1";
export const STORAGE_NOTES_KEY = "planner:notes:v1";

export function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
