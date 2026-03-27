import { Database } from "bun:sqlite";
import type { SQLQueryBindings } from "bun:sqlite";

let db: Database | null = null;

function initSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS dc_nodes (
      id TEXT PRIMARY KEY,
      node_type TEXT NOT NULL DEFAULT 'SSH',
      node_display_name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      commands TEXT NOT NULL DEFAULT '["show run brief","show cdp nei","show ip route","show ip int brief"]',
      node_user TEXT NOT NULL,
      node_passwd TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      results TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_dc_nodes_display_name ON dc_nodes(node_display_name)"
  );

  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      raw_response TEXT NOT NULL,
      graph_data TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS api_call_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_body TEXT NOT NULL,
      response_status INTEGER NOT NULL,
      response_body TEXT NOT NULL,
      duration_ms INTEGER NOT NULL
    )
  `);

  // Seed default schedule settings
  database.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('dc_schedule_type', 'daily')"
  );
  database.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('dc_schedule_time', '02:00')"
  );
  database.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('last_analysis_id', '')"
  );
  database.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('last_seen_analysis_id', '')"
  );
}

export function getDb(): Database {
  if (db) return db;

  db = new Database("data/app.db");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  initSchema(db);

  return db;
}

export function query<T>(sql: string, ...params: SQLQueryBindings[]): T[] {
  return getDb().query<T, SQLQueryBindings[]>(sql).all(...params);
}

export function get<T>(
  sql: string,
  ...params: SQLQueryBindings[]
): T | undefined {
  return getDb().query<T, SQLQueryBindings[]>(sql).get(...params) ?? undefined;
}

export function run(sql: string, ...params: SQLQueryBindings[]) {
  return getDb().query(sql).run(...params);
}
