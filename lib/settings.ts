import { get, run, getDb } from "./db";

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export function getSetting(key: string): string | undefined {
  const row = get<SettingRow>("SELECT * FROM settings WHERE key = ?", key);
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  run(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')",
    key,
    value,
    value
  );
}

/**
 * Atomically transitions a setting from `expected` to `next`.
 * Returns true if the value was actually changed (i.e. it matched `expected`),
 * false otherwise. Use this for compare-and-swap on flags like `analysis_running`.
 */
export function compareAndSetSetting(key: string, expected: string, next: string): boolean {
  const result = getDb().query(
    "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ? AND value = ?"
  ).run(next, key, expected);
  return result.changes > 0;
}

export interface Schedule {
  type: string;
  time: string;
  day?: string;
}

export function getSchedule(): Schedule {
  const type = getSetting("dc_schedule_type") ?? "daily";
  const time = getSetting("dc_schedule_time") ?? "02:00";
  const day = getSetting("dc_schedule_day");
  return { type, time, ...(day !== undefined && { day }) };
}

export function setSchedule(type: string, time: string, day?: string): void {
  setSetting("dc_schedule_type", type);
  setSetting("dc_schedule_time", time);
  if (day !== undefined) {
    setSetting("dc_schedule_day", day);
  }
}
