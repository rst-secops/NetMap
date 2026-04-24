"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ConfigFormState } from "../app/analysis/configs/actions";
import { fetchOllamaModelsAction } from "../app/analysis/configs/actions";

const PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "google", label: "Google AI Studio" },
  { value: "ollama", label: "Ollama (Local)" },
];

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  ],
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
};

interface DefaultValues {
  id: string;
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
  apiKey: string;
  hasApiKey: boolean;
  isDefault: boolean;
  skipVlans: boolean;
}

interface ConfigFormProps {
  action: (prev: ConfigFormState, formData: FormData) => Promise<ConfigFormState>;
  defaultValues?: DefaultValues;
}

export default function ConfigForm({ action, defaultValues }: ConfigFormProps) {
  const [state, formAction, isPending] = useActionState<ConfigFormState, FormData>(action, {});
  const [editingKey, setEditingKey] = useState(!defaultValues?.hasApiKey);
  const [provider, setProvider] = useState(defaultValues?.provider ?? "claude");
  const isEdit = !!defaultValues;

  // Cloud provider model selection
  const models = MODELS_BY_PROVIDER[provider] ?? MODELS_BY_PROVIDER.claude;
  const defaultModel = defaultValues?.provider === provider ? defaultValues.model : models[0]?.value;

  // Ollama-specific state
  const [baseUrlValue, setBaseUrlValue] = useState(defaultValues?.baseUrl ?? "");
  const [ollamaModels, setOllamaModels] = useState<string[]>(
    defaultValues?.provider === "ollama" && defaultValues.model ? [defaultValues.model] : []
  );
  const [selectedOllamaModel, setSelectedOllamaModel] = useState(
    defaultValues?.provider === "ollama" ? (defaultValues.model ?? "") : ""
  );
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    if (newProvider !== "ollama") {
      setOllamaModels([]);
      setSelectedOllamaModel("");
      setModelFetchError(null);
    }
  }

  function handleBaseUrlChange(value: string) {
    setBaseUrlValue(value);
    if (ollamaModels.length > 0) {
      setOllamaModels([]);
      setSelectedOllamaModel("");
      setModelFetchError(null);
    }
  }

  async function handleFetchModels() {
    if (!baseUrlValue) {
      setModelFetchError("Enter a server URL first");
      return;
    }
    setFetchingModels(true);
    setModelFetchError(null);
    const result = await fetchOllamaModelsAction(baseUrlValue);
    setFetchingModels(false);
    if (result.error) {
      setModelFetchError(result.error);
    } else if (result.models) {
      setOllamaModels(result.models);
      setSelectedOllamaModel((prev) =>
        result.models!.includes(prev) ? prev : (result.models![0] ?? "")
      );
    }
  }

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-gray-800 bg-gray-900 p-6">
      {isEdit && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="apiKeyChanged" value={editingKey ? "true" : "false"} />

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
          Config Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name}
          placeholder="e.g. Production Claude Sonnet"
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.name}</p>
        )}
      </div>

      {/* Provider */}
      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-300">
          LLM Provider
        </label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {state.fieldErrors?.provider && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.provider}</p>
        )}
      </div>

      {/* Ollama Server URL (shown above model for Ollama only) */}
      {provider === "ollama" && (
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300">
            Ollama Server URL
          </label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="text"
            value={baseUrlValue}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="http://192.168.1.100:11434"
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.baseUrl && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.baseUrl}</p>
          )}
        </div>
      )}

      {/* API Key */}
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
          API Key
          {provider === "ollama" && (
            <span className="ml-1 font-normal text-gray-500">(optional)</span>
          )}
        </label>
        {!editingKey && defaultValues?.hasApiKey ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400">
              {defaultValues.apiKey}
            </span>
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300"
              onClick={() => setEditingKey(true)}
            >
              Change
            </button>
          </div>
        ) : (
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder={provider === "ollama" ? "Bearer token (if required)" : "sk-ant-..."}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            onChange={() => { if (!editingKey) setEditingKey(true); }}
          />
        )}
        {state.fieldErrors?.apiKey && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.apiKey}</p>
        )}
      </div>

      {/* Model */}
      <div>
        <label htmlFor="model" className="block text-sm font-medium text-gray-300">
          Model
        </label>
        {provider === "ollama" ? (
          <div className="mt-1 space-y-2">
            <div className="flex gap-2">
              <select
                id="model"
                name="model"
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                disabled={ollamaModels.length === 0}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm disabled:opacity-50"
              >
                {ollamaModels.length === 0 ? (
                  <option value="">— fetch models first —</option>
                ) : (
                  ollamaModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {fetchingModels ? "Fetching…" : "Fetch Models"}
              </button>
            </div>
            {modelFetchError && (
              <p className="text-xs text-red-400">{modelFetchError}</p>
            )}
          </div>
        ) : (
          <select
            id="model"
            name="model"
            defaultValue={defaultModel}
            key={provider}
            className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}
        {state.fieldErrors?.model && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.model}</p>
        )}
      </div>

      {/* Max Tokens */}
      <div>
        <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-300">
          Max Tokens
        </label>
        <input
          id="maxTokens"
          name="maxTokens"
          type="number"
          min={1}
          max={500000}
          defaultValue={defaultValues?.maxTokens ?? 4096}
          className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
        />
        {state.fieldErrors?.maxTokens && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.maxTokens}</p>
        )}
      </div>

      {/* Base URL for cloud providers */}
      {provider !== "ollama" && (
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300">
            API Base URL
            <span className="ml-1 font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="text"
            defaultValue={defaultValues?.baseUrl}
            placeholder="https://api.anthropic.com"
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.baseUrl && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.baseUrl}</p>
          )}
        </div>
      )}

      {/* Skip VLANs — Ollama only */}
      {provider === "ollama" && (
        <div className="flex items-center gap-2">
          <input
            id="skipVlans"
            name="skipVlans"
            type="checkbox"
            defaultChecked={defaultValues?.skipVlans ?? false}
            className="rounded border-gray-600"
          />
          <label htmlFor="skipVlans" className="text-sm font-medium text-gray-300">
            Skip VLANs in analysis
            <span className="ml-1 font-normal text-gray-500">(recommended for smaller models)</span>
          </label>
        </div>
      )}

      {/* Default */}
      <div className="flex items-center gap-2">
        <input
          id="isDefault"
          name="isDefault"
          type="checkbox"
          defaultChecked={defaultValues?.isDefault ?? false}
          className="rounded border-gray-600"
        />
        <label htmlFor="isDefault" className="text-sm font-medium text-gray-300">
          Set as default config
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending ? "Saving..." : isEdit ? "Update Config" : "Create Config"}
        </button>
        <Link
          href="/analysis/configs"
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
