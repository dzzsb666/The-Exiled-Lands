import type { Progress } from "./types";
export const STORAGE_KEY = "exiled-lands.progress.v1";
export const PREFERENCES_KEY = "exiled-lands.preferences.v1";
export interface MapPreferences {
  version: 1;
  enabled: number[] | null;
  hideFound: boolean;
  onlyPending: boolean;
  labels: boolean;
}
export function loadPreferences(): MapPreferences {
  const fallback: MapPreferences = {
    version: 1,
    enabled: null,
    hideFound: false,
    onlyPending: false,
    labels: false,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
    if (
      !raw ||
      raw.version !== 1 ||
      !Array.isArray(raw.enabled) ||
      raw.enabled.length > 1000 ||
      !raw.enabled.every(Number.isSafeInteger)
    )
      return fallback;
    return {
      version: 1,
      enabled: [...new Set<number>(raw.enabled)],
      hideFound: raw.hideFound === true,
      onlyPending: raw.onlyPending === true,
      labels: raw.labels === true,
    };
  } catch {
    return fallback;
  }
}
const empty = (): Progress => ({ version: 1, found: [], notes: {}, pins: [] });
export function validateProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") throw new Error("文件格式不正确");
  const p = raw as Progress;
  if (
    p.version !== 1 ||
    !Array.isArray(p.found) ||
    !Array.isArray(p.pins) ||
    !p.notes ||
    typeof p.notes !== "object" ||
    Array.isArray(p.notes)
  )
    throw new Error("文件格式不正确");
  if (
    p.found.length > 20000 ||
    p.pins.length > 2000 ||
    Object.keys(p.notes).length > 20000
  )
    throw new Error("文件内容过多");
  if (
    !p.found.every(Number.isSafeInteger) ||
    !Object.values(p.notes).every(
      (n) => typeof n === "string" && n.length <= 5000,
    )
  )
    throw new Error("进度或备注格式不正确");
  if (
    !p.pins.every(
      (pin) =>
        typeof pin.id === "string" &&
        pin.id.length <= 100 &&
        typeof pin.name === "string" &&
        pin.name.length <= 120 &&
        typeof pin.note === "string" &&
        pin.note.length <= 5000 &&
        Number.isFinite(pin.x) &&
        Number.isFinite(pin.y) &&
        pin.x >= 0 &&
        pin.x <= 4000 &&
        pin.y >= 0 &&
        pin.y <= 4000,
    )
  )
    throw new Error("个人标记格式不正确");
  if (new Set(p.pins.map((pin) => pin.id)).size !== p.pins.length)
    throw new Error("个人标记 ID 重复");
  return {
    version: 1,
    found: [...new Set(p.found)],
    notes: Object.fromEntries(Object.entries(p.notes)),
    pins: p.pins.map((pin) => ({ ...pin })),
  };
}
export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? validateProgress(JSON.parse(raw)) : empty();
  } catch {
    return empty();
  }
}
export function downloadFile(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
