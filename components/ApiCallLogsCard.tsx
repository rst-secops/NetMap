"use client";

import { useState } from "react";
import type { ApiCallLog } from "../lib/api-call-logs";

function StatusBadge({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
        ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
      }`}
    >
      {status}
    </span>
  );
}

function LogRow({ log }: { log: ApiCallLog }) {
  const [open, setOpen] = useState(false);

  const prettyJson = (s: string) => {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  return (
    <li className="border-b border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xs text-gray-500 font-mono w-36 shrink-0">{log.createdAt}</span>
        <StatusBadge status={log.responseStatus} />
        <span className="text-xs text-gray-300 font-mono truncate flex-1">{log.model}</span>
        <span className="text-xs text-gray-500 font-mono shrink-0">{log.durationMs} ms</span>
        <span className="text-gray-600 text-xs ml-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Request</p>
            <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
              {prettyJson(log.requestBody)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Response</p>
            <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
              {prettyJson(log.responseBody)}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

export default function ApiCallLogsCard({ logs }: { logs: ApiCallLog[] }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">API Call Log</h2>
        <p className="mt-0.5 text-sm text-gray-400">Recent LLM API requests and responses.</p>
      </div>
      {logs.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-500">No API calls recorded yet.</p>
      ) : (
        <ul>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  );
}
