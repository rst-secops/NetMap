"use client";

import { useActionState, useRef, useState } from "react";
import {
  updateClaudeConfigAction,
  type ClaudeConfigFormState,
} from "../app/analysis/actions";

interface ClaudeConfigProps {
  config: {
    apiKey: string;
    hasKey: boolean;
    model: string;
    maxTokens: number;
    baseUrl: string;
  };
}

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
];

export default function ClaudeConfigCard({ config }: ClaudeConfigProps) {
  const [state, formAction, isPending] = useActionState<ClaudeConfigFormState, FormData>(
    updateClaudeConfigAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [editingKey, setEditingKey] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold">Claude Configuration</h2>
      <p className="mt-1 text-sm text-gray-400">
        Configure the Anthropic API connection for analysis.
      </p>

      {state.success && (
        <p className="mt-3 text-sm text-green-400">Configuration saved.</p>
      )}
      {state.error && (
        <p className="mt-3 text-sm text-red-400">{state.error}</p>
      )}

      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <input
          type="hidden"
          name="apiKeyChanged"
          value={editingKey ? "true" : "false"}
        />

        {/* API Key */}
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-gray-300"
          >
            API Key
          </label>
          {!editingKey && config.hasKey ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400">
                {config.apiKey}
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
              onChange={() => {
                if (!editingKey) setEditingKey(true);
              }}
            />
          )}
          {state.fieldErrors?.apiKey && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.apiKey}</p>
          )}
        </div>

        {/* Model */}
        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-gray-300"
          >
            Model
          </label>
          <select
            id="model"
            name="model"
            defaultValue={config.model}
            className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.model && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.model}</p>
          )}
        </div>

        {/* Max Tokens */}
        <div>
          <label
            htmlFor="maxTokens"
            className="block text-sm font-medium text-gray-300"
          >
            Max Tokens
          </label>
          <input
            id="maxTokens"
            name="maxTokens"
            type="number"
            min={1}
            max={32768}
            defaultValue={config.maxTokens}
            className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.maxTokens && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.maxTokens}</p>
          )}
        </div>

        {/* Base URL */}
        <div>
          <label
            htmlFor="baseUrl"
            className="block text-sm font-medium text-gray-300"
          >
            API Base URL
            <span className="ml-1 font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="text"
            defaultValue={config.baseUrl}
            placeholder="https://api.anthropic.com"
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.baseUrl && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.baseUrl}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
            onClick={() => {
              formRef.current?.reset();
              setEditingKey(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
