import { get, run } from "./db";

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
