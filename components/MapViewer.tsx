"use client";

import { useEffect, useRef, useTransition, useState } from "react";
import Link from "next/link";
import NetworkMap from "./NetworkMap";
import { markAnalysisSeenAction, deleteAnalysisResultAction } from "../app/actions";
import type { NetworkGraph } from "../lib/schemas";

interface ResultSummary {
  id: string;
  name: string;
  createdAt: string;
  graphData: NetworkGraph;
}

interface MapViewerProps {
  results: ResultSummary[];
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function MapViewer({ results }: MapViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(results[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Reset selection when results list changes (e.g. after deletion)
  useEffect(() => {
    if (results.length > 0 && (!selectedId || !results.find((r) => r.id === selectedId))) {
      setSelectedId(results[0].id);
    } else if (results.length === 0) {
      setSelectedId(null);
    }
  }, [results, selectedId]);

  // Mark the selected result as seen
  useEffect(() => {
    if (selectedId) {
      startTransition(() => markAnalysisSeenAction(selectedId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const current = results.find((r) => r.id === selectedId) ?? null;

  if (results.length === 0 || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <h1 className="text-2xl font-bold">Network Maps</h1>
        <p className="text-gray-400">No analysis results yet.</p>
        <Link href="/analysis" className="text-blue-400 hover:text-blue-300 text-sm">
          Go to Analysis Configuration to run your first analysis
        </Link>
      </div>
    );
  }

  const nodeCount = current.graphData.nodes.filter((n) => n.type !== "vlan").length;
  const edgeCount = current.graphData.edges.length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 py-3 flex items-center gap-4 border-b border-gray-800 shrink-0">
        {/* Result selector */}
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
        >
          {results.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || r.createdAt}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-400">
          {nodeCount} nodes &middot; {edgeCount} edges
        </span>
        <span className="text-xs text-gray-600">{current.createdAt}</span>

        <div className="flex-1" />

        {/* Delete button */}
        <button
          type="button"
          aria-label="Delete this result"
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:border-red-700 hover:text-red-400 transition-colors"
          onClick={() => dialogRef.current?.showModal()}
        >
          <TrashIcon />
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <NetworkMap key={selectedId} graph={current.graphData} />
      </div>

      {/* Delete confirmation dialog */}
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-100 backdrop:bg-black/50"
      >
        <h3 className="text-lg font-semibold">Delete Result</h3>
        <p className="mt-2 text-sm text-gray-400">
          Delete <strong>{current.name || current.createdAt}</strong>? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
            onClick={() => {
              startTransition(async () => {
                await deleteAnalysisResultAction(current.id);
                dialogRef.current?.close();
              });
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
