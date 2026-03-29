"use client";

import React, { forwardRef, memo, useImperativeHandle, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import type { NetworkGraph } from "../lib/schemas";
import type { NodePositions } from "../lib/analysis-results";

export type NetworkMapHandle = { getPositions: () => NodePositions };

// ─── Layout ──────────────────────────────────────────────────────────────────

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;

function getLayoutedElements(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return {
        ...n,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      };
    }),
    edges,
  };
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function InfraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

function HostIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ApIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function RouterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const NODE_ICON: Record<string, () => React.ReactElement> = {
  router: RouterIcon,
  switch: InfraIcon,
  ap: ApIcon,
  host: HostIcon,
  unknown: InfraIcon,
};

const NODE_COLORS: Record<string, { border: string; badge: string }> = {
  router:  { border: "border-blue-500",   badge: "bg-blue-700 text-blue-100" },
  switch:  { border: "border-green-500",  badge: "bg-green-700 text-green-100" },
  ap:      { border: "border-purple-500", badge: "bg-purple-700 text-purple-100" },
  host:    { border: "border-gray-400",   badge: "bg-gray-600 text-gray-100" },
  unknown: { border: "border-gray-500",   badge: "bg-gray-600 text-gray-200" },
};

// ─── Custom Node ─────────────────────────────────────────────────────────────

const DeviceNode = memo(({ data }: NodeProps) => {
  const nodeType = data.nodeType as string;
  const label = data.label as string;
  const colors = NODE_COLORS[nodeType] ?? NODE_COLORS.unknown;
  const Icon = NODE_ICON[nodeType] ?? InfraIcon;
  return (
    <div
      className={`rounded-lg border-2 bg-gray-800 text-white shadow-md w-40 ${colors.border}`}
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="px-2 py-2 flex items-center gap-2">
        <span className={`shrink-0 rounded p-1 ${colors.badge}`}>
          <Icon />
        </span>
        <span className="text-sm font-semibold leading-tight truncate" title={label}>
          {label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
DeviceNode.displayName = "DeviceNode";

const nodeTypes: NodeTypes = { deviceNode: DeviceNode };

// ─── Side Panel ──────────────────────────────────────────────────────────────

type Selection =
  | { kind: "node"; title: string; nodeType: string; data: Record<string, unknown> }
  | { kind: "edge"; source: string; target: string; data: Record<string, unknown> };

function DataPanel({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-xs text-gray-500">No metadata.</p>;
  return (
    <dl className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{key}</dt>
          <dd className="text-xs text-gray-200 break-all whitespace-pre-wrap">
            {typeof value === "object"
              ? JSON.stringify(value, null, 2)
              : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const NetworkMapInner = forwardRef<NetworkMapHandle, { graph: NetworkGraph; savedPositions?: NodePositions | null }>(
function NetworkMapInner({ graph, savedPositions }, ref) {
  const [selection, setSelection] = useState<Selection | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Filter out VLAN nodes and track their IDs so connected edges can be filtered too
    const vlanIds = new Set(
      graph.nodes.filter((n) => n.type === "vlan").map((n) => n.id)
    );

    const rawNodes: FlowNode[] = graph.nodes
      .filter((n) => n.type !== "vlan")
      .map((n) => ({
        id: n.id,
        type: "deviceNode",
        data: { label: n.label, nodeType: n.type, extraData: n.data ?? {} },
        position: savedPositions?.[n.id] ?? { x: 0, y: 0 },
      }));

    // Filter edges that reference filtered-out VLAN nodes.
    // Store edge label in data (not as a canvas label) so it's accessible on click only.
    const rawEdges: FlowEdge[] = graph.edges
      .filter((e) => !vlanIds.has(e.source) && !vlanIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        // No canvas label — details are shown in the side panel on click
        style: { stroke: "#6b7280", strokeWidth: 2, cursor: "pointer" },
        data: {
          // Preserve original label (e.g. interface name) in data for the panel
          ...(e.label ? { link: e.label } : {}),
          ...(e.data ?? {}),
        },
      }));

    return savedPositions ? { nodes: rawNodes, edges: rawEdges } : getLayoutedElements(rawNodes, rawEdges);
  }, [graph, savedPositions]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useImperativeHandle(ref, () => ({
    getPositions: () => {
      const positions: NodePositions = {};
      nodes.forEach((n) => { positions[n.id] = n.position; });
      return positions;
    },
  }));

  // Build an id→label lookup for edge source/target display
  const nodeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    graph.nodes.forEach((n) => { map[n.id] = n.label; });
    return map;
  }, [graph]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          setSelection({
            kind: "node",
            title: node.data.label as string,
            nodeType: node.data.nodeType as string,
            data: (node.data.extraData as Record<string, unknown>) ?? {},
          });
        }}
        onEdgeClick={(_, edge) => {
          setSelection({
            kind: "edge",
            source: nodeLabel[edge.source] ?? edge.source,
            target: nodeLabel[edge.target] ?? edge.target,
            data: (edge.data as Record<string, unknown>) ?? {},
          });
        }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {selection !== null && (
        <aside className="absolute top-0 right-0 h-full w-72 overflow-y-auto border-l border-gray-700 bg-gray-900 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              {selection.kind === "node" ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                    {selection.nodeType}
                  </p>
                  <h3 className="text-sm font-semibold">{selection.title}</h3>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Link</p>
                  <h3 className="text-sm font-semibold leading-snug">
                    {selection.source}
                    <span className="text-gray-500 mx-1">↔</span>
                    {selection.target}
                  </h3>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-xs text-gray-400 hover:text-gray-100 shrink-0 ml-2"
            >
              Close
            </button>
          </div>
          <DataPanel data={selection.data} />
        </aside>
      )}
    </div>
  );
});
NetworkMapInner.displayName = "NetworkMapInner";

export default function NetworkMap({
  graph,
  savedPositions,
  ref,
}: {
  graph: NetworkGraph;
  savedPositions?: NodePositions | null;
  ref?: React.Ref<NetworkMapHandle>;
}) {
  return (
    <ReactFlowProvider>
      <NetworkMapInner graph={graph} savedPositions={savedPositions} ref={ref} />
    </ReactFlowProvider>
  );
}
