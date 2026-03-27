"use server";

import { revalidatePath } from "next/cache";
import { setAnalysisProvider, setClaudeConfig, getClaudeConfig } from "../../lib/analysis-settings";
import { analysisProviderSchema, claudeConfigSchema, networkGraphSchema } from "../../lib/schemas";
import { getAllNodes } from "../../lib/dc-nodes";
import { buildPrompt } from "../../lib/prompt-builder";
import { saveAnalysisResult } from "../../lib/analysis-results";
import { setSetting } from "../../lib/settings";
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
  error?: string;
  nodeCount?: number;
  edgeCount?: number;
}

let analysisInProgress = false;

export async function runAnalysisAction(
  _prev: RunAnalysisState,
  formData: FormData
): Promise<RunAnalysisState> {
  if (analysisInProgress) {
    return { error: "Analysis already running. Please wait." };
  }
  analysisInProgress = true;
  try {
    const allNodes = getAllNodes();
    const nodesWithResults = allNodes.filter((n) => n.results !== null);
    if (nodesWithResults.length === 0) {
      return {
        error:
          "No collected data available — run data collection first.",
      };
    }

    const configId = formData.get("configId") as string | null;
    const config = (configId ? getConfigById(configId) : null) ?? getDefaultConfig();
    if (!config) {
      return {
        error: "No analysis config found. Please create one in Analysis Configs.",
      };
    }
    if (!config.apiKey) {
      return {
        error: `Analysis config "${config.name}" has no API key configured.`,
      };
    }

    const { systemPrompt, userMessage } = buildPrompt(
      nodesWithResults,
      config.maxTokens
    );

    let fetchUrl: string;
    let fetchHeaders: Record<string, string>;
    let requestPayload: object;

    if (config.provider === "google") {
      const apiBase = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
      fetchUrl = `${apiBase}/models/${config.model}:generateContent`;
      fetchHeaders = {
        "x-goog-api-key": config.apiKey,
        "content-type": "application/json",
      };
      requestPayload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: config.maxTokens },
      };
    } else {
      // Claude (default)
      const apiBase = config.baseUrl || "https://api.anthropic.com";
      fetchUrl = `${apiBase}/v1/messages`;
      fetchHeaders = {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      };
      requestPayload = {
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      };
    }

    const t0 = Date.now();
    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(requestPayload),
    });
    const durationMs = Date.now() - t0;

    const responseText = await response.text();

    saveApiCallLog({
      provider: config.provider,
      model: config.model,
      configId: config.id,
      requestBody: JSON.stringify(requestPayload),
      responseStatus: response.status,
      responseBody: responseText,
      durationMs,
    });

    if (!response.ok) {
      const providerLabel = config.provider === "google" ? "Google AI" : "Claude";
      return { error: `${providerLabel} API error ${response.status}: ${responseText}` };
    }

    const responseBody = JSON.parse(responseText);
    const rawText: string | undefined = config.provider === "google"
      ? responseBody?.candidates?.[0]?.content?.parts?.[0]?.text
      : responseBody?.content?.[0]?.text;
    if (!rawText) {
      return { error: "Unexpected response format from Claude API." };
    }

    let parsed;
    try {
      // Strip markdown code fences if present (e.g. ```json ... ```)
      const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const json = JSON.parse(stripped);
      const validation = networkGraphSchema.safeParse(json);
      if (!validation.success) {
        return {
          error:
            "Claude returned invalid graph structure: " +
            (validation.error.issues[0]?.message ?? "unknown error"),
        };
      }
      parsed = validation.data;
    } catch {
      return { error: "Claude returned non-JSON output. Try again or check your prompt." };
    }

    const resultName = `${config.name} – ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const saved = saveAnalysisResult(rawText, parsed, resultName, config.name);
    setSetting("last_analysis_id", saved.id);
    revalidatePath("/");

    return {
      success: true,
      nodeCount: parsed.nodes.length,
      edgeCount: parsed.edges.length,
    };
  } finally {
    analysisInProgress = false;
  }
}
