import { nanoid } from "nanoid";
import { query, get, run, getDb } from "./db";

interface AnalysisConfigRow {
  id: string;
  name: string;
  provider: string;
  model: string;
  max_tokens: number;
  base_url: string;
  api_key: string;
  is_default: number;
  skip_vlans: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  skipVlans: boolean;
  createdAt: string;
  updatedAt: string;
}

function toConfig(row: AnalysisConfigRow): AnalysisConfig {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    model: row.model,
    maxTokens: row.max_tokens,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    isDefault: row.is_default === 1,
    skipVlans: row.skip_vlans === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllConfigs(): AnalysisConfig[] {
  const rows = query<AnalysisConfigRow>("SELECT * FROM analysis_configs ORDER BY name");
  return rows.map(toConfig);
}

export function getConfigById(id: string): AnalysisConfig | undefined {
  const row = get<AnalysisConfigRow>("SELECT * FROM analysis_configs WHERE id = ?", id);
  return row ? toConfig(row) : undefined;
}

export function getDefaultConfig(): AnalysisConfig | undefined {
  const row = get<AnalysisConfigRow>(
    "SELECT * FROM analysis_configs WHERE is_default = 1 LIMIT 1"
  );
  return row ? toConfig(row) : undefined;
}

interface ConfigData {
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  skipVlans: boolean;
}

export function createConfig(data: ConfigData): AnalysisConfig {
  const id = nanoid();

  const doCreate = getDb().transaction(() => {
    if (data.isDefault) {
      run("UPDATE analysis_configs SET is_default = 0");
    }
    run(
      `INSERT INTO analysis_configs (id, name, provider, model, max_tokens, base_url, api_key, is_default, skip_vlans)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.provider,
      data.model,
      data.maxTokens,
      data.baseUrl,
      data.apiKey,
      data.isDefault ? 1 : 0,
      data.skipVlans ? 1 : 0
    );
  });

  doCreate();
  return toConfig(get<AnalysisConfigRow>("SELECT * FROM analysis_configs WHERE id = ?", id)!);
}

interface UpdateConfigData {
  name?: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
  skipVlans?: boolean;
}

export function updateConfig(id: string, data: UpdateConfigData): AnalysisConfig | undefined {
  const doUpdate = getDb().transaction(() => {
    if (data.isDefault) {
      run("UPDATE analysis_configs SET is_default = 0");
    } else if (data.isDefault === false) {
      // If unchecking default on the currently-default config, promote oldest other config.
      // If no other config exists, keep this one as default (override the requested change).
      const current = get<AnalysisConfigRow>("SELECT * FROM analysis_configs WHERE id = ?", id);
      if (current?.is_default === 1) {
        const oldest = get<AnalysisConfigRow>(
          "SELECT * FROM analysis_configs WHERE id != ? ORDER BY created_at ASC LIMIT 1",
          id
        );
        if (oldest) {
          run("UPDATE analysis_configs SET is_default = 1 WHERE id = ?", oldest.id);
        } else {
          // No other config — force isDefault to stay true so the SET clause keeps is_default = 1
          data = { ...data, isDefault: true };
        }
      }
    }
    // Build SET clause dynamically to avoid overwriting unchanged fields
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
    if (data.provider !== undefined) { fields.push("provider = ?"); params.push(data.provider); }
    if (data.model !== undefined) { fields.push("model = ?"); params.push(data.model); }
    if (data.maxTokens !== undefined) { fields.push("max_tokens = ?"); params.push(data.maxTokens); }
    if (data.baseUrl !== undefined) { fields.push("base_url = ?"); params.push(data.baseUrl); }
    if (data.apiKey !== undefined) { fields.push("api_key = ?"); params.push(data.apiKey); }
    if (data.isDefault !== undefined) { fields.push("is_default = ?"); params.push(data.isDefault ? 1 : 0); }
    if (data.skipVlans !== undefined) { fields.push("skip_vlans = ?"); params.push(data.skipVlans ? 1 : 0); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    params.push(id);

    run(
      `UPDATE analysis_configs SET ${fields.join(", ")} WHERE id = ?`,
      ...params
    );
  });

  doUpdate();
  const row = get<AnalysisConfigRow>("SELECT * FROM analysis_configs WHERE id = ?", id);
  return row ? toConfig(row) : undefined;
}

export function deleteConfig(id: string): void {
  const all = query<AnalysisConfigRow>("SELECT * FROM analysis_configs ORDER BY created_at ASC");

  if (all.length <= 1) return; // Refuse to delete the last config

  const target = all.find((r) => r.id === id);
  if (!target) return;

  const doDelete = getDb().transaction(() => {
    run("DELETE FROM analysis_configs WHERE id = ?", id);
    // If we deleted the default, promote the oldest remaining config
    if (target.is_default === 1) {
      const remaining = all.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        run("UPDATE analysis_configs SET is_default = 1 WHERE id = ?", remaining[0].id);
      }
    }
  });

  doDelete();
}

export function setDefaultConfig(id: string): void {
  const doSet = getDb().transaction(() => {
    run("UPDATE analysis_configs SET is_default = 0");
    run("UPDATE analysis_configs SET is_default = 1 WHERE id = ?", id);
  });
  doSet();
}
