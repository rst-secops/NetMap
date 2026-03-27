import { nanoid } from "nanoid";
import { query, get, run, getDb } from "./db";
import type { NetworkGraph } from "./schemas";

interface AnalysisResultRow {
  id: string;
  created_at: string;
  name: string;
  config_name: string;
  raw_response: string;
  graph_data: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  name: string;
  configName: string;
  rawResponse: string;
  graphData: NetworkGraph;
}

function toResult(row: AnalysisResultRow): AnalysisResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    configName: row.config_name,
    rawResponse: row.raw_response,
    graphData: JSON.parse(row.graph_data) as NetworkGraph,
  };
}

export function saveAnalysisResult(
  rawResponse: string,
  graphData: NetworkGraph,
  name: string,
  configName: string
): AnalysisResult {
  const id = nanoid();

  const doSave = getDb().transaction(() => {
    run(
      "INSERT INTO analysis_results (id, name, config_name, raw_response, graph_data) VALUES (?, ?, ?, ?, ?)",
      id,
      name,
      configName,
      rawResponse,
      JSON.stringify(graphData)
    );
    // Enforce 100-result cap — delete oldest beyond the limit
    run(
      `DELETE FROM analysis_results WHERE id IN (
        SELECT id FROM analysis_results ORDER BY created_at ASC
        LIMIT MAX(0, (SELECT COUNT(*) FROM analysis_results) - 100)
      )`
    );
  });
  doSave();

  const row = get<AnalysisResultRow>(
    "SELECT * FROM analysis_results WHERE id = ?",
    id
  )!;
  return toResult(row);
}

export function getLatestAnalysisResult(): AnalysisResult | undefined {
  const row = get<AnalysisResultRow>(
    "SELECT * FROM analysis_results ORDER BY created_at DESC LIMIT 1"
  );
  return row ? toResult(row) : undefined;
}

export function listAnalysisResults(): AnalysisResult[] {
  const rows = query<AnalysisResultRow>(
    "SELECT * FROM analysis_results ORDER BY created_at DESC"
  );
  return rows.map(toResult);
}

export function deleteAnalysisResult(id: string): void {
  run("DELETE FROM analysis_results WHERE id = ?", id);
}
