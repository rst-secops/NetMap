"use client";

import { useActionState } from "react";
import {
  runAnalysisAction,
  type RunAnalysisState,
} from "../app/analysis/actions";

export default function RunAnalysisButton({ configId }: { configId?: string } = {}) {
  const [state, formAction, isPending] = useActionState<
    RunAnalysisState,
    FormData
  >(runAnalysisAction, {});

  return (
    <div>
      <form action={formAction}>
        {configId && <input type="hidden" name="configId" value={configId} />}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending ? "Analyzing..." : "Run Analysis"}
        </button>
      </form>
      {state.success && (
        <p className="mt-2 text-sm text-green-400">
          Analysis complete — {state.nodeCount} nodes, {state.edgeCount} edges.
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}
