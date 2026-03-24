import { nanoid } from "nanoid";
import { query, get, run } from "./db";

export interface DcNode {
  id: string;
  nodeType: string;
  nodeDisplayName: string;
  host: string;
  port: number;
  commands: string[];
  nodeUser: string;
  nodePasswd: string;
  isEnabled: boolean;
  results: unknown | null;
  createdAt: string;
  updatedAt: string;
}

interface DcNodeRow {
  id: string;
  node_type: string;
  node_display_name: string;
  host: string;
  port: number;
  commands: string;
  node_user: string;
  node_passwd: string;
  is_enabled: number;
  results: string | null;
  created_at: string;
  updated_at: string;
}

function toNode(row: DcNodeRow): DcNode {
  return {
    id: row.id,
    nodeType: row.node_type,
    nodeDisplayName: row.node_display_name,
    host: row.host,
    port: row.port,
    commands: JSON.parse(row.commands),
    nodeUser: row.node_user,
    nodePasswd: row.node_passwd,
    isEnabled: row.is_enabled === 1,
    results: row.results ? JSON.parse(row.results) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllNodes(): DcNode[] {
  const rows = query<DcNodeRow>("SELECT * FROM dc_nodes ORDER BY node_display_name");
  return rows.map(toNode);
}

export function getNodeById(id: string): DcNode | undefined {
  const row = get<DcNodeRow>("SELECT * FROM dc_nodes WHERE id = ?", id);
  return row ? toNode(row) : undefined;
}

export interface CreateNodeData {
  nodeType?: string;
  nodeDisplayName: string;
  host: string;
  port?: number;
  commands: string[];
  nodeUser: string;
  nodePasswd: string;
  isEnabled?: boolean;
}

export function createNode(data: CreateNodeData): DcNode {
  const id = nanoid();
  run(
    `INSERT INTO dc_nodes (id, node_type, node_display_name, host, port, commands, node_user, node_passwd, is_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.nodeType ?? "SSH",
    data.nodeDisplayName,
    data.host,
    data.port ?? 22,
    JSON.stringify(data.commands),
    data.nodeUser,
    data.nodePasswd,
    data.isEnabled !== false ? 1 : 0
  );
  return getNodeById(id)!;
}

export function updateNode(
  id: string,
  data: Partial<CreateNodeData>
): DcNode | undefined {
  const existing = getNodeById(id);
  if (!existing) return undefined;

  run(
    `UPDATE dc_nodes SET
      node_type = ?, node_display_name = ?, host = ?, port = ?,
      commands = ?, node_user = ?, node_passwd = ?,
      is_enabled = ?, updated_at = datetime('now')
     WHERE id = ?`,
    data.nodeType ?? existing.nodeType,
    data.nodeDisplayName ?? existing.nodeDisplayName,
    data.host ?? existing.host,
    data.port ?? existing.port,
    data.commands ? JSON.stringify(data.commands) : JSON.stringify(existing.commands),
    data.nodeUser ?? existing.nodeUser,
    data.nodePasswd ?? existing.nodePasswd,
    data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0),
    id
  );
  return getNodeById(id);
}

export function deleteNode(id: string): void {
  run("DELETE FROM dc_nodes WHERE id = ?", id);
}

export function toggleNodeEnabled(id: string, isEnabled: boolean): void {
  run(
    "UPDATE dc_nodes SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?",
    isEnabled ? 1 : 0,
    id
  );
}

export function getEnabledNodes(): DcNode[] {
  const rows = query<DcNodeRow>(
    "SELECT * FROM dc_nodes WHERE is_enabled = 1 ORDER BY node_display_name"
  );
  return rows.map(toNode);
}

export function saveNodeResults(id: string, results: Record<string, string>): void {
  run(
    "UPDATE dc_nodes SET results = ?, updated_at = datetime('now') WHERE id = ?",
    JSON.stringify(results),
    id
  );
}

export function saveNodeError(id: string, error: string): void {
  run(
    "UPDATE dc_nodes SET results = ?, updated_at = datetime('now') WHERE id = ?",
    JSON.stringify({ _error: error }),
    id
  );
}
