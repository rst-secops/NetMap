import { getSetting, setSetting } from "./settings";

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
}

export function getAnalysisProvider(): string {
  return getSetting("analysis_provider") ?? "claude";
}

export function setAnalysisProvider(provider: string): void {
  setSetting("analysis_provider", provider);
}

export function getClaudeConfig(): ClaudeConfig {
  return {
    apiKey: getSetting("analysis_claude_api_key") ?? "",
    model: getSetting("analysis_claude_model") ?? "claude-sonnet-4-20250514",
    maxTokens: Number(getSetting("analysis_claude_max_tokens") ?? "4096"),
    baseUrl: getSetting("analysis_claude_base_url") ?? "",
  };
}

export function setClaudeConfig(config: Partial<ClaudeConfig>): void {
  if (config.apiKey !== undefined) {
    setSetting("analysis_claude_api_key", config.apiKey);
  }
  if (config.model !== undefined) {
    setSetting("analysis_claude_model", config.model);
  }
  if (config.maxTokens !== undefined) {
    setSetting("analysis_claude_max_tokens", String(config.maxTokens));
  }
  if (config.baseUrl !== undefined) {
    setSetting("analysis_claude_base_url", config.baseUrl);
  }
}
