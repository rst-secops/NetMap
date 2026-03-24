"use client";

import { useTransition } from "react";
import { toggleNodeEnabledAction } from "../app/dc-nodes/actions";

export default function EnableToggle({
  id,
  isEnabled,
}: {
  id: string;
  isEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEnabled}
      aria-label={isEnabled ? "Disable node" : "Enable node"}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 ${
        isEnabled ? "bg-green-600" : "bg-gray-600"
      }`}
      onClick={() => {
        startTransition(() => {
          toggleNodeEnabledAction(id, !isEnabled);
        });
      }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          isEnabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
