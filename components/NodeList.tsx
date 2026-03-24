"use client";

import Link from "next/link";
import EnableToggle from "./EnableToggle";
import DeleteNodeButton from "./DeleteNodeButton";

interface NodeSummary {
  id: string;
  nodeType: string;
  nodeDisplayName: string;
  host: string;
  port: number;
  isEnabled: boolean;
}

function PencilIcon() {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function NodeList({ nodes }: { nodes: NodeSummary[] }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">DC Nodes</h2>
        <Link
          href="/dc-nodes/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
        >
          Add New Node
        </Link>
      </div>

      {nodes.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          No data collection nodes configured yet. Add one to get started.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Host / IP</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Enabled</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id} className="border-b border-gray-800">
                <td className="py-3">
                  <Link
                    href={`/dc-nodes/${node.id}`}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {node.nodeDisplayName}
                  </Link>
                </td>
                <td className="py-3 text-gray-400">
                  {node.host}:{node.port}
                </td>
                <td className="py-3">
                  <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">
                    {node.nodeType}
                  </span>
                </td>
                <td className="py-3">
                  <EnableToggle id={node.id} isEnabled={node.isEnabled} />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dc-nodes/${node.id}/edit`}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label={`Edit ${node.nodeDisplayName}`}
                    >
                      <PencilIcon />
                    </Link>
                    <DeleteNodeButton
                      id={node.id}
                      nodeDisplayName={node.nodeDisplayName}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
