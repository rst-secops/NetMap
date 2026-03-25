"use client";

import { useState, useTransition } from "react";
import { runCollectionForNode } from "../app/dc-nodes/actions";

export default function CollectNodeButton({ nodeId }: { nodeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await runCollectionForNode(nodeId);
            setMessage({ text: result.message, success: result.success });
            setTimeout(() => setMessage(null), 5000);
          });
        }}
        className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Collecting..." : "Collect Data"}
      </button>
      {message && (
        <span
          className={`text-sm ${message.success ? "text-green-400" : "text-red-400"}`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
