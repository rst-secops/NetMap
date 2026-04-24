"use server";

import { revalidatePath } from "next/cache";
import { setAnalysisProvider, setClaudeConfig, getClaudeConfig } from "../../lib/analysis-settings";
import { analysisProviderSchema, claudeConfigSchema, networkGraphSchema } from "../../lib/schemas";
import { getAllNodes } from "../../lib/dc-nodes";
import { buildPrompt, buildOllamaPrompt } from "../../lib/prompt-builder";
import { saveAnalysisResult } from "../../lib/analysis-results";
import { setSetting, getSetting } from "../../lib/settings";
import { saveApiCallLog } from "../../lib/api-call-logs";
import { getConfigById, getDefaultConfig } from "../../lib/analysis-configs";

export async function updateProviderAction(formData: FormData) {
  const result = analysisProviderSchema.safeParse({
    provider: formData.get("provider") as string,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid provider" };
  }

  setAnalysisProvider(result.data.provider);
  revalidatePath("/analysis");
  return { success: true };
}

export interface ClaudeConfigFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateClaudeConfigAction(
  _prev: ClaudeConfigFormState,
  formData: FormData
): Promise<ClaudeConfigFormState> {
  const apiKeyChanged = formData.get("apiKeyChanged") === "true";
  const apiKey = apiKeyChanged
    ? (formData.get("apiKey") as string)
    : "placeholder-unchanged";

  const raw = {
    apiKey,
    model: formData.get("model") as string,
    maxTokens: formData.get("maxTokens") as string,
    baseUrl: (formData.get("baseUrl") as string)?.trim() ?? "",
  };

  const result = claudeConfigSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const config: Record<string, string | number> = {
    model: result.data.model,
    maxTokens: result.data.maxTokens,
    baseUrl: result.data.baseUrl ?? "",
  };

  if (apiKeyChanged) {
    config.apiKey = result.data.apiKey;
  }

  setClaudeConfig(config as Parameters<typeof setClaudeConfig>[0]);
  revalidatePath("/analysis");
  return { success: true };
}

export interface RunAnalysisState {
  success?: boolean;
  started?: boolean;
  error?: string;
  nodeCount?: number;
  edgeCount?: number;
}

export async function getAnalysisStatusAction(): Promise<{ running: boolean; error?: string }> {
  return {
    running: getSetting("analysis_running") === "1",
    error: getSetting("analysis_last_error") || undefined,
  };
}

async function performAnalysis(
  config: Awaited<ReturnType<typeof getConfigById>>,
  systemPrompt: string,
  userMessage: string
): Promise<RunAnalysisState> {
  let fetchUrl: string;
  let fetchHeaders: Record<string, string>;
  let requestPayload: object;

  if (config!.provider === "google") {
    const apiBase = config!.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    fetchUrl = `${apiBase}/models/${config!.model}:generateContent`;
    fetchHeaders = {
      "x-goog-api-key": config!.apiKey,
      "content-type": "application/json",
    };
    requestPayload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: config!.maxTokens },
    };
  } else if (config!.provider === "ollama") {
    fetchUrl = `${config!.baseUrl}/api/chat`;
    fetchHeaders = { "content-type": "application/json" };
    if (config!.apiKey) fetchHeaders["Authorization"] = `Bearer ${config!.apiKey}`;
    requestPayload = {
      model: config!.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
      format: "json",
      options: { num_predict: config!.maxTokens },
    };
  } else {
    const apiBase = config!.baseUrl || "https://api.anthropic.com";
    fetchUrl = `${apiBase}/v1/messages`;
    fetchHeaders = {
      "x-api-key": config!.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
    requestPayload = {
      model: config!.model,
      max_tokens: config!.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    };
  }

  const t0 = Date.now();
  const response = await fetch(fetchUrl, {
    method: "POST",
    headers: fetchHeaders,
    body: JSON.stringify(requestPayload),
    ...(config!.provider === "ollama" && { signal: AbortSignal.timeout(1_200_000) }),
  });
  const durationMs = Date.now() - t0;

  const responseText = await response.text();

  saveApiCallLog({
    provider: config!.provider,
    model: config!.model,
    configId: config!.id,
    requestBody: JSON.stringify(requestPayload),
    responseStatus: response.status,
    responseBody: responseText,
    durationMs,
  });

  if (!response.ok) {
    const providerLabel = config!.provider === "google" ? "Google AI" : config!.provider === "ollama" ? "Ollama" : "Claude";
    return { error: `${providerLabel} API error ${response.status}: ${responseText}` };
  }

  const responseBody = JSON.parse(responseText);
  const rawText: string | undefined =
    config!.provider === "google"
      ? responseBody?.candidates?.[0]?.content?.parts?.[0]?.text
      : config!.provider === "ollama"
      ? responseBody?.message?.content
      : responseBody?.content?.[0]?.text;
  if (!rawText) {
    return { error: "Unexpected response format from LLM API." };
  }

  let parsed;
  try {
    const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const json = JSON.parse(stripped);
    const validation = networkGraphSchema.safeParse(json);
    if (!validation.success) {
      const providerLabel = config!.provider === "google" ? "Google AI" : config!.provider === "ollama" ? "Ollama" : "Claude";
      return {
        error:
          `${providerLabel} returned invalid graph structure: ` +
          (validation.error.issues[0]?.message ?? "unknown error") +
          (validation.error.issues[0]?.path ? ` (at ${validation.error.issues[0].path.join(".")})` : ""),
      };
    }
    parsed = validation.data;
  } catch {
    return { error: "LLM returned non-JSON output. Try again or check your prompt." };
  }

  const resultName = `${config!.name} – ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const saved = saveAnalysisResult(rawText, parsed, resultName, config!.name);
  setSetting("last_analysis_id", saved.id);
  revalidatePath("/");

  return {
    success: true,
    nodeCount: parsed.nodes.length,
    edgeCount: parsed.edges.length,
  };
}

export async function runAnalysisAction(
  _prev: RunAnalysisState,
  formData: FormData
): Promise<RunAnalysisState> {
  if (getSetting("analysis_running") === "1") {
    return { error: "Analysis already running. Please wait." };
  }

  const allNodes = getAllNodes();
  const nodesWithResults = allNodes.filter((n) => n.results !== null);
  if (nodesWithResults.length === 0) {
    return { error: "No collected data available — run data collection first." };
  }

  const configId = formData.get("configId") as string | null;
  const config = (configId ? getConfigById(configId) : null) ?? getDefaultConfig();
  if (!config) {
    return { error: "No analysis config found. Please create one in Analysis Configs." };
  }
  if (!config.apiKey && config.provider !== "ollama") {
    return { error: `Analysis config "${config.name}" has no API key configured.` };
  }

  const { systemPrompt, userMessage } = config.provider === "ollama"
    ? buildOllamaPrompt(nodesWithResults, config.maxTokens, config.skipVlans ?? false)
    : buildPrompt(nodesWithResults, config.maxTokens);

  setSetting("analysis_running", "1");

  if (config.provider === "ollama") {
    void (async () => {
      try {
        const result = await performAnalysis(config, systemPrompt, userMessage);
        setSetting("analysis_last_error", result.error ?? "");
      } catch (err) {
        setSetting("analysis_last_error", err instanceof Error ? err.message : "Unknown error");
      } finally {
        setSetting("analysis_running", "0");
      }
    })();
    return { started: true };
  }

  try {
    return await performAnalysis(config, systemPrompt, userMessage);
  } finally {
    setSetting("analysis_running", "0");
  }
}
