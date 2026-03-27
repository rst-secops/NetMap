"use client";

import { useRef, useTransition } from "react";
import { deleteConfigAction } from "../app/analysis/configs/actions";

function TrashIcon() {
  return (
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
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function DeleteConfigButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        className="text-gray-400 hover:text-red-400 transition-colors"
        onClick={() => dialogRef.current?.showModal()}
      >
        <TrashIcon />
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-100 backdrop:bg-black/50"
      >
        <h3 className="text-lg font-semibold">Delete Analysis Config</h3>
        <p className="mt-2 text-sm text-gray-400">
          Are you sure you want to delete <strong>{name}</strong>? This action
          cannot be undone.
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
                await deleteConfigAction(id);
                dialogRef.current?.close();
              });
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </dialog>
    </>
  );
}
