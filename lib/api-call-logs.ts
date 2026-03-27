import { nanoid } from "nanoid";
import { query, run } from "./db";

interface ApiCallLogRow {
  id: string;
  created_at: string;
  provider: string;
  model: string;
  config_id: string;
  request_body: string;
  response_status: number;
  response_body: string;
  duration_ms: number;
}

export interface ApiCallLog {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  configId: string;
  requestBody: string;
  responseStatus: number;
  responseBody: string;
  durationMs: number;
}

function toLog(row: ApiCallLogRow): ApiCallLog {
  return {
    id: row.id,
    createdAt: row.created_at,
    provider: row.provider,
    model: row.model,
    configId: row.config_id,
    requestBody: row.request_body,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    durationMs: row.duration_ms,
  };
}

export function saveApiCallLog(
  log: Omit<ApiCallLog, "id" | "createdAt">
): void {
  run(
    `INSERT INTO api_call_logs (id, provider, model, config_id, request_body, response_status, response_body, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    nanoid(),
    log.provider,
    log.model,
    log.configId,
    log.requestBody,
    log.responseStatus,
    log.responseBody,
    log.durationMs
  );
}

export function listApiCallLogsByConfigId(configId: string, limit = 20): ApiCallLog[] {
  const rows = query<ApiCallLogRow>(
    "SELECT * FROM api_call_logs WHERE config_id = ? ORDER BY created_at DESC LIMIT ?",
    configId,
    limit
  );
  return rows.map(toLog);
}

export function listApiCallLogs(limit = 20): ApiCallLog[] {
  const rows = query<ApiCallLogRow>(
    "SELECT * FROM api_call_logs ORDER BY created_at DESC LIMIT ?",
    limit
  );
  return rows.map(toLog);
}
