"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { runAnalysisAction, type RunAnalysisState } from "../app/analysis/actions";

interface ConfigOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function RunAnalysisCard({
  configs,
  latestResultInfo,
}: {
  configs: ConfigOption[];
  latestResultInfo?: string;
}) {
  const router = useRouter();
  const defaultConfig = configs.find((c) => c.isDefault) ?? configs[0];
  const [selectedConfigId, setSelectedConfigId] = useState(defaultConfig?.id ?? "");
  const [state, formAction, isPending] = useActionState<RunAnalysisState, FormData>(
    runAnalysisAction,
    {}
  );

  useEffect(() => {
    if (state.success) {
      router.push("/");
    }
  }, [state.success, router]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold">Run Analysis</h2>
      <p className="mt-1 mb-4 text-sm text-gray-400">
        Send collected device data to Claude for topology analysis.
      </p>

      {configs.length === 0 ? (
        <p className="text-sm text-yellow-400">
          No analysis configs found.{" "}
          <a href="/analysis/configs" className="underline hover:text-yellow-300">
            Create one first.
          </a>
        </p>
      ) : (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="configId" value={selectedConfigId} />
          <select
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? "Analyzing..." : "Run Analysis"}
          </button>
        </form>
      )}

      {state.success && (
        <p className="mt-3 text-sm text-green-400">
          Analysis complete — {state.nodeCount} nodes, {state.edgeCount} edges.
        </p>
      )}
      {state.error && (
        <p className="mt-3 text-sm text-red-400">{state.error}</p>
      )}
      {latestResultInfo && (
        <p className="mt-4 text-xs text-gray-500">{latestResultInfo}</p>
      )}
    </div>
  );
}
