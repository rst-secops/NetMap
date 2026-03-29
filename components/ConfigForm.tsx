"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ConfigFormState } from "../app/analysis/configs/actions";

const PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "google", label: "Google AI Studio" },
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

  const models = MODELS_BY_PROVIDER[provider] ?? MODELS_BY_PROVIDER.claude;
  const defaultModel = defaultValues?.provider === provider ? defaultValues.model : models[0]?.value;

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
          onChange={(e) => setProvider(e.target.value)}
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

      {/* API Key */}
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
          API Key
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
            placeholder="sk-ant-..."
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

      {/* Base URL */}
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
