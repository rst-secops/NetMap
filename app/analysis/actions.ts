"use server";

import { revalidatePath } from "next/cache";
import { setAnalysisProvider, setClaudeConfig } from "../../lib/analysis-settings";
import { analysisProviderSchema, claudeConfigSchema } from "../../lib/schemas";

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
