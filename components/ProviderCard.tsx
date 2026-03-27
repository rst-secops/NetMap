"use client";

import { useTransition } from "react";
import { updateProviderAction } from "../app/analysis/actions";

const PROVIDERS = [{ value: "claude", label: "Claude (Anthropic)" }];

export default function ProviderCard({ provider }: { provider: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold">LLM Provider</h2>
      <p className="mt-1 text-sm text-gray-400">
        Select where to run the data analysis.
      </p>
      <div className="mt-4">
        <label htmlFor="provider" className="block text-sm font-medium text-gray-300">
          Provider
        </label>
        <select
          id="provider"
          value={provider}
          disabled={isPending}
          onChange={(e) => {
            const formData = new FormData();
            formData.set("provider", e.target.value);
            startTransition(() => {
              updateProviderAction(formData);
            });
          }}
          className="mt-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
