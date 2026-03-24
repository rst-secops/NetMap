"use client";

import { useState } from "react";

interface NodeResultsProps {
  results: Record<string, string> | null;
}

export default function NodeResults({ results }: NodeResultsProps) {
  const entries = results ? Object.entries(results) : [];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    entries.length > 0 ? 0 : null
  );

  if (!results || entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold">Collection Results</h2>
        <p className="mt-2 text-sm text-gray-500">
          No results yet. Run a data collection to see output here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Collection Results</h2>
      <div className="space-y-2">
        {entries.map(([command, output], i) => {
          const isExpanded = expandedIndex === i;
          const panelId = `result-panel-${i}`;
          const headerId = `result-header-${i}`;

          return (
            <div key={command} className="rounded-lg border border-gray-800">
              <h3>
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() =>
                    setExpandedIndex(isExpanded ? null : i)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-mono hover:bg-gray-800/50"
                >
                  <span className="text-gray-300">{command}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`shrink-0 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </h3>
              {isExpanded && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className="border-t border-gray-800"
                >
                  <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-gray-400">
                    {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
