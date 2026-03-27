import { nanoid } from "nanoid";
import { query, get, run } from "./db";
import type { NetworkGraph } from "./schemas";

interface AnalysisResultRow {
  id: string;
  created_at: string;
  raw_response: string;
  graph_data: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  rawResponse: string;
  graphData: NetworkGraph;
}

function toResult(row: AnalysisResultRow): AnalysisResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    rawResponse: row.raw_response,
    graphData: JSON.parse(row.graph_data) as NetworkGraph,
  };
}

export function saveAnalysisResult(
  rawResponse: string,
  graphData: NetworkGraph
): AnalysisResult {
  const id = nanoid();
  run(
    "INSERT INTO analysis_results (id, raw_response, graph_data) VALUES (?, ?, ?)",
    id,
    rawResponse,
    JSON.stringify(graphData)
  );
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
