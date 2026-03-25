"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { NodeFormState } from "../app/dc-nodes/actions";

const DEFAULT_COMMANDS = [
  "show run brief",
  "show cdp nei",
  "show ip route",
  "show ip int brief",
];

interface NodeFormProps {
  action: (prev: NodeFormState, formData: FormData) => Promise<NodeFormState>;
  defaultValues?: {
    id?: string;
    nodeType: string;
    nodeDisplayName: string;
    host: string;
    port: number;
    commands: string[];
    nodeUser: string;
    nodePasswd: string;
    isEnabled: boolean;
  };
}

export default function NodeForm({ action, defaultValues }: NodeFormProps) {
  const isEdit = !!defaultValues?.id;

  const [state, formAction, isPending] = useActionState(action, {});

  const [commands, setCommands] = useState<string[]>(
    defaultValues?.commands ?? DEFAULT_COMMANDS
  );

  function addCommand() {
    setCommands((prev) => [...prev, ""]);
  }

  function removeCommand(index: number) {
    setCommands((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCommand(index: number, value: string) {
    setCommands((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function moveCommand(index: number, direction: "up" | "down") {
    setCommands((prev) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Node Identity */}
      <fieldset className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <legend className="px-2 text-sm font-medium text-gray-400">
          Node Identity
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nodeDisplayName" className="block text-sm font-medium text-gray-300">
              Node Name
            </label>
            <input
              id="nodeDisplayName"
              name="nodeDisplayName"
              type="text"
              required
              defaultValue={defaultValues?.nodeDisplayName ?? ""}
              aria-describedby={state.fieldErrors?.nodeDisplayName ? "nodeDisplayName-error" : undefined}
              aria-invalid={!!state.fieldErrors?.nodeDisplayName}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Core-Router-1"
            />
            {state.fieldErrors?.nodeDisplayName && (
              <p id="nodeDisplayName-error" className="mt-1 text-xs text-red-400">
                {state.fieldErrors.nodeDisplayName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="nodeType" className="block text-sm font-medium text-gray-300">
              Type
            </label>
            <select
              id="nodeType"
              name="nodeType"
              defaultValue={defaultValues?.nodeType ?? "SSH"}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SSH">SSH</option>
              <option value="API">API</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Connection */}
      <fieldset className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <legend className="px-2 text-sm font-medium text-gray-400">
          Connection
        </legend>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-300">
              Host / IP Address
            </label>
            <input
              id="host"
              name="host"
              type="text"
              required
              defaultValue={defaultValues?.host ?? ""}
              aria-describedby={state.fieldErrors?.host ? "host-error" : undefined}
              aria-invalid={!!state.fieldErrors?.host}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="192.168.1.1 or router.local"
            />
            {state.fieldErrors?.host && (
              <p id="host-error" className="mt-1 text-xs text-red-400">
                {state.fieldErrors.host}
              </p>
            )}
          </div>

          <div className="w-28">
            <label htmlFor="port" className="block text-sm font-medium text-gray-300">
              Port
            </label>
            <input
              id="port"
              name="port"
              type="number"
              required
              min={1}
              max={65535}
              defaultValue={defaultValues?.port ?? 22}
              aria-describedby={state.fieldErrors?.port ? "port-error" : undefined}
              aria-invalid={!!state.fieldErrors?.port}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {state.fieldErrors?.port && (
              <p id="port-error" className="mt-1 text-xs text-red-400">
                {state.fieldErrors.port}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nodeUser" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="nodeUser"
              name="nodeUser"
              type="text"
              required
              defaultValue={defaultValues?.nodeUser ?? ""}
              autoComplete="off"
              aria-describedby={state.fieldErrors?.nodeUser ? "nodeUser-error" : undefined}
              aria-invalid={!!state.fieldErrors?.nodeUser}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="admin"
            />
            {state.fieldErrors?.nodeUser && (
              <p id="nodeUser-error" className="mt-1 text-xs text-red-400">
                {state.fieldErrors.nodeUser}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="nodePasswd" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="nodePasswd"
              name="nodePasswd"
              type="password"
              required
              defaultValue={defaultValues?.nodePasswd ?? ""}
              autoComplete="off"
              aria-describedby={state.fieldErrors?.nodePasswd ? "nodePasswd-error" : undefined}
              aria-invalid={!!state.fieldErrors?.nodePasswd}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {state.fieldErrors?.nodePasswd && (
              <p id="nodePasswd-error" className="mt-1 text-xs text-red-400">
                {state.fieldErrors.nodePasswd}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Commands */}
      <fieldset className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <legend className="px-2 text-sm font-medium text-gray-400">
          Commands
        </legend>

        {state.fieldErrors?.commands && (
          <p role="alert" className="mb-3 text-xs text-red-400">
            {state.fieldErrors.commands}
          </p>
        )}

        <ul className="space-y-2" role="list">
          {commands.map((cmd, i) => (
            <li key={i} className="flex items-center gap-2">
              <label htmlFor={`command-${i}`} className="sr-only">
                Command {i + 1}
              </label>
              <input
                id={`command-${i}`}
                name="commands"
                type="text"
                value={cmd}
                onChange={(e) => updateCommand(i, e.target.value)}
                className="block flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. show ip route"
              />
              <button
                type="button"
                onClick={() => moveCommand(i, "up")}
                disabled={i === 0}
                aria-label={`Move command ${i + 1} up`}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveCommand(i, "down")}
                disabled={i === commands.length - 1}
                aria-label={`Move command ${i + 1} down`}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeCommand(i)}
                disabled={commands.length <= 1}
                aria-label={`Remove command ${i + 1}`}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addCommand}
          className="mt-3 rounded-lg border border-dashed border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300"
        >
          + Add Command
        </button>
      </fieldset>

      {/* Enabled */}
      <fieldset className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <legend className="text-sm font-medium text-gray-300">
              Enabled
            </legend>
            <p className="text-xs text-gray-500">
              Include this node in scheduled data collection runs.
            </p>
          </div>
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={defaultValues?.isEnabled ?? true}
            className="h-5 w-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/dc-nodes"
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : isEdit
              ? "Update Node"
              : "Create Node"}
        </button>
      </div>
    </form>
  );
}
