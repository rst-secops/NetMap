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

  database.run(`
    CREATE TABLE IF NOT EXISTS analysis_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL DEFAULT 'claude',
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      base_url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Add columns to existing tables — check via PRAGMA first for compatibility
  const arCols = database.query("PRAGMA table_info(analysis_results)").all() as { name: string }[];
  const arColNames = new Set(arCols.map((c) => c.name));
  if (!arColNames.has("name"))
    database.run("ALTER TABLE analysis_results ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  if (!arColNames.has("config_name"))
    database.run("ALTER TABLE analysis_results ADD COLUMN config_name TEXT NOT NULL DEFAULT ''");
  if (!arColNames.has("layout_data"))
    database.run("ALTER TABLE analysis_results ADD COLUMN layout_data TEXT");

  const aclCols = database.query("PRAGMA table_info(api_call_logs)").all() as { name: string }[];
  if (!aclCols.some((c) => c.name === "config_id"))
    database.run("ALTER TABLE api_call_logs ADD COLUMN config_id TEXT NOT NULL DEFAULT ''");

  const acCols = database.query("PRAGMA table_info(analysis_configs)").all() as { name: string }[];
  if (!acCols.some((c) => c.name === "skip_vlans"))
    database.run("ALTER TABLE analysis_configs ADD COLUMN skip_vlans INTEGER NOT NULL DEFAULT 0");

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

  // Migrate existing global Claude config from settings into analysis_configs as "Default"
  database.run(`
    INSERT OR IGNORE INTO analysis_configs (id, name, provider, model, max_tokens, base_url, api_key, is_default)
    SELECT
      'default-migrated',
      'Default',
      COALESCE(MAX(CASE WHEN key = 'analysis_provider' THEN value END), 'claude'),
      COALESCE(MAX(CASE WHEN key = 'analysis_claude_model' THEN value END), 'claude-sonnet-4-20250514'),
      CAST(COALESCE(MAX(CASE WHEN key = 'analysis_claude_max_tokens' THEN value END), '4096') AS INTEGER),
      COALESCE(MAX(CASE WHEN key = 'analysis_claude_base_url' THEN value END), ''),
      COALESCE(MAX(CASE WHEN key = 'analysis_claude_api_key' THEN value END), ''),
      1
    FROM settings
  `);
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
