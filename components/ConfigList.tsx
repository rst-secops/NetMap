"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setDefaultConfigAction } from "../app/analysis/configs/actions";
import DeleteConfigButton from "./DeleteConfigButton";

interface ConfigSummary {
  id: string;
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  isDefault: boolean;
  hasApiKey: boolean;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function StarFilledIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarOutlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-20250514": "Sonnet 4",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
  "claude-opus-4-20250514": "Opus 4",
};

function DefaultToggle({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (isDefault) {
    return (
      <span className="text-yellow-400" title="Default config">
        <StarFilledIcon />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={isPending}
      aria-label="Set as default"
      title="Set as default"
      className="text-gray-500 hover:text-yellow-400 transition-colors disabled:opacity-50"
      onClick={() => {
        startTransition(async () => { await setDefaultConfigAction(id); });
      }}
    >
      <StarOutlineIcon />
    </button>
  );
}

export default function ConfigList({ configs }: { configs: ConfigSummary[] }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analysis Configs</h2>
        <Link
          href="/analysis/configs/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
        >
          Add New Config
        </Link>
      </div>

      {configs.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          No analysis configs yet. Add one to get started.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Model</th>
              <th className="pb-2 font-medium">Max Tokens</th>
              <th className="pb-2 font-medium">API Key</th>
              <th className="pb-2 font-medium">Default</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id} className="border-b border-gray-800">
                <td className="py-3 font-medium">
                  <Link
                    href={`/analysis/configs/${config.id}`}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {config.name}
                  </Link>
                </td>
                <td className="py-3 text-gray-400">
                  {MODEL_LABELS[config.model] ?? config.model}
                </td>
                <td className="py-3 text-gray-400">{config.maxTokens}</td>
                <td className="py-3">
                  {config.hasApiKey ? (
                    <span className="text-green-400 text-xs">Configured</span>
                  ) : (
                    <span className="text-red-400 text-xs">Missing</span>
                  )}
                </td>
                <td className="py-3">
                  <DefaultToggle id={config.id} isDefault={config.isDefault} />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/analysis/configs/${config.id}/edit`}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label={`Edit ${config.name}`}
                    >
                      <PencilIcon />
                    </Link>
                    <DeleteConfigButton id={config.id} name={config.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
