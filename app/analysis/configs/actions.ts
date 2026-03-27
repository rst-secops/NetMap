"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analysisConfigSchema } from "../../../lib/schemas";
import {
  createConfig,
  updateConfig,
  deleteConfig,
  setDefaultConfig,
} from "../../../lib/analysis-configs";

export interface ConfigFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createConfigAction(
  _prev: ConfigFormState,
  formData: FormData
): Promise<ConfigFormState> {
  const raw = {
    name: formData.get("name") as string,
    provider: formData.get("provider") as string,
    model: formData.get("model") as string,
    maxTokens: formData.get("maxTokens") as string,
    baseUrl: (formData.get("baseUrl") as string)?.trim() ?? "",
    apiKey: formData.get("apiKey") as string,
    isDefault: formData.get("isDefault") === "on",
  };

  const result = analysisConfigSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  if (!result.data.apiKey) {
    return { fieldErrors: { apiKey: "API key is required" } };
  }

  try {
    createConfig({
      ...result.data,
      baseUrl: result.data.baseUrl ?? "",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return { fieldErrors: { name: "A config with this name already exists." } };
    }
    return { error: "Failed to create config." };
  }

  redirect("/analysis/configs");
}

export async function updateConfigAction(
  _prev: ConfigFormState,
  formData: FormData
): Promise<ConfigFormState> {
  const id = formData.get("id") as string;
  const apiKeyChanged = formData.get("apiKeyChanged") === "true";

  const raw = {
    name: formData.get("name") as string,
    provider: formData.get("provider") as string,
    model: formData.get("model") as string,
    maxTokens: formData.get("maxTokens") as string,
    baseUrl: (formData.get("baseUrl") as string)?.trim() ?? "",
    apiKey: apiKeyChanged ? (formData.get("apiKey") as string) : "placeholder",
    isDefault: formData.get("isDefault") === "on",
  };

  const result = analysisConfigSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const updateData: Parameters<typeof updateConfig>[1] = {
    name: result.data.name,
    provider: result.data.provider,
    model: result.data.model,
    maxTokens: result.data.maxTokens,
    baseUrl: result.data.baseUrl ?? "",
    isDefault: result.data.isDefault,
  };
  if (apiKeyChanged) {
    updateData.apiKey = result.data.apiKey;
  }

  try {
    updateConfig(id, updateData);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return { fieldErrors: { name: "A config with this name already exists." } };
    }
    return { error: "Failed to update config." };
  }

  redirect("/analysis/configs");
}

export async function deleteConfigAction(id: string): Promise<{ error?: string }> {
  try {
    deleteConfig(id);
    revalidatePath("/analysis/configs");
    return {};
  } catch {
    return { error: "Failed to delete config." };
  }
}

export async function setDefaultConfigAction(id: string): Promise<{ error?: string }> {
  try {
    setDefaultConfig(id);
    revalidatePath("/analysis/configs");
    return {};
  } catch {
    return { error: "Failed to update default config." };
  }
}
