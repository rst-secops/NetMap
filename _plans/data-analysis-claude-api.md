# Plan: Data Analysis via Claude API

## Context
NetMap collects raw CLI/API output from network devices but has no analysis layer yet. This plan implements the full pipeline: bundle collected device data → send to Claude API with a structured system prompt → validate the JSON topology response → persist it → render it as an interactive React Flow network map on the home page.

---

## Implementation Order

### 1. Extend DB schema — `lib/db.ts`
Inside `initSchema`, add after the `settings` seeds:
```sql
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_response TEXT NOT NULL,
  graph_data TEXT NOT NULL
)
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_analysis_id', '')
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_seen_analysis_id', '')
```
Use `database.run()` directly (same as existing seeds). No index needed.

---

### 2. Add graph schemas — `lib/schemas.ts`
Append `networkNodeSchema`, `networkEdgeSchema`, `networkGraphSchema` (nodes + edges arrays). Export `NetworkGraph`, `NetworkNode`, `NetworkEdge` inferred types.
Node type enum: `router | switch | ap | host | vlan | unknown`.

---

### 3. Create `lib/analysis-results.ts`
Repository following the `lib/dc-nodes.ts` pattern.
Exports:
- `saveAnalysisResult(rawResponse: string, graphData: NetworkGraph): AnalysisResult` — nanoid id, INSERT, return saved row
- `getLatestAnalysisResult(): AnalysisResult | undefined` — `ORDER BY created_at DESC LIMIT 1`
- `listAnalysisResults(): AnalysisResult[]`

`AnalysisResult` interface has camelCase fields; `graphData` is parsed from stored JSON string on read.
Reuse `query`, `get`, `run` from `./db`.

---

### 4. Create `lib/prompt-builder.ts`
Pure function, no I/O.
Signature: `buildPrompt(nodes: DcNode[], maxTokens: number): { systemPrompt: string; userMessage: string }`

**System prompt** must:
1. Set role as "network topology analyst"
2. Require response to be **only** a JSON object `{ nodes, edges }` — no prose, no markdown fences
3. Define the schema inline: node fields (id, type, label, data), edge fields (id, source, target, label?, data?)
4. Instruct to include unknown/ambiguous components with `type: "unknown"` rather than omitting them

**User message**: Format each node as `Device: <name> (<type>)\nHost: <host>\n--- Output ---\n<results>\n---`

**Truncation**: budget = `maxTokens * 0.8 * 4` chars. Accumulate per-node; once budget exceeded, append `[TRUNCATED]` to that node's results and stop adding more result content.

---

### 5. Add `runAnalysisAction` to `app/analysis/actions.ts`
Add module-level `let analysisInProgress = false` guard. Add `RunAnalysisState` type: `{ success?, error?, nodeCount?, edgeCount? }`.

**Action flow** (in try/finally to reset flag):
1. Guard: return error if already running
2. `getAllNodes()` → filter `node.results !== null` → error if empty
3. `getClaudeConfig()` → error if no `apiKey`
4. `buildPrompt(nodes, config.maxTokens)`
5. `fetch((config.baseUrl || "https://api.anthropic.com") + "/v1/messages", { method: "POST", headers: { "x-api-key", "anthropic-version": "2023-06-01", "content-type" }, body: JSON.stringify({ model, max_tokens, system, messages }) })`
6. On non-ok response: return `{ error: "Claude API error N: ..." }`
7. Extract `body.content[0].text`, try `JSON.parse`, validate with `networkGraphSchema.safeParse`
8. On invalid JSON or schema failure: return `{ error: "..." }`
9. `saveAnalysisResult(rawText, parsed.data)`
10. `setSetting("last_analysis_id", saved.id)` (from `lib/settings.ts`)
11. `revalidatePath("/")`
12. Return `{ success: true, nodeCount, edgeCount }`

Imports to add: `getAllNodes` (lib/dc-nodes), `getClaudeConfig` (lib/analysis-settings), `buildPrompt` (lib/prompt-builder), `saveAnalysisResult` (lib/analysis-results), `setSetting` (lib/settings), `networkGraphSchema` (lib/schemas).

---

### 6. Create `components/RunAnalysisButton.tsx`
Client component. Use `useActionState<RunAnalysisState, FormData>(runAnalysisAction, {})`.
Wrap in `<form action={formAction}>` with a submit button (matches ClaudeConfigCard pattern).
Show: "Analyzing..." while pending, green success with node/edge counts, red error text.

---

### 7. Update `app/analysis/page.tsx`
Add `RunAnalysisButton` and an analysis summary card below existing provider/config cards.
Fetch `getLatestAnalysisResult()` server-side; if present, show last run timestamp + node/edge counts.

---

### 8. Notification badge — `components/Navbar.tsx`
Server component reads: `getLatestAnalysisResult()` and `getSetting("last_seen_analysis_id")`.
If `latest?.id !== lastSeen`, render a `<span>` red dot absolutely positioned on the BellIcon.
Both functions are already importable (`lib/analysis-results`, `lib/settings`).

---

### 9. Mark-as-seen — new files
**`app/actions.ts`** (new root-level server actions file):
```typescript
"use server";
export async function markAnalysisSeenAction(id: string) {
  setSetting("last_seen_analysis_id", id);
  revalidatePath("/");
}
```

**`components/AnalysisSeenMarker.tsx`** (client, renders null):
```typescript
"use client";
useEffect(() => { markAnalysisSeenAction(analysisId); }, [analysisId]);
```

---

### 10. Install dagre + create `components/NetworkMap.tsx`
**Install:** `bun add @dagrejs/dagre` (ESM-compatible fork, required for Bun/Next.js).

Client component. Key implementation rules from React Flow docs:
- Define `nodeTypes` **outside** the component (or via `useMemo`) to prevent re-renders
- Wrap with `<ReactFlowProvider>` since it's not a direct child of `ReactFlow`
- Import `"@xyflow/react/dist/style.css"` inside this client component (not globals.css)
- Compute dagre layout inside `useMemo([graph])` so it only runs when data changes

**Dagre setup:** `rankdir: "TB"`, node size 160×60, nodesep 60, ranksep 80. Center nodes: `x = pos.x - W/2`, `y = pos.y - H/2`.

**Side panel:** absolute-positioned panel on the right (inside a `relative` container) that shows selected node's `data` as formatted JSON. Toggle via `onNodeClick`.

Custom node component shows device label + type badge.

---

### 11. Update `app/page.tsx`
Full server component. Add `export const dynamic = "force-dynamic"`.
Fetch `getLatestAnalysisResult()`.
- **No result:** empty state with link to `/analysis`
- **Has result:** render `<AnalysisSeenMarker>` + header bar (node/edge counts, timestamp) + `<NetworkMap graph={result.graphData} />` filling remaining viewport height (`h-[calc(100vh-3.5rem)]` to account for the 14-unit Navbar).

---

## Files Changed

| File | Action |
|------|--------|
| `lib/db.ts` | Modify |
| `lib/schemas.ts` | Modify |
| `lib/analysis-results.ts` | Create |
| `lib/prompt-builder.ts` | Create |
| `app/analysis/actions.ts` | Modify |
| `components/RunAnalysisButton.tsx` | Create |
| `app/analysis/page.tsx` | Modify |
| `components/Navbar.tsx` | Modify |
| `app/actions.ts` | Create |
| `components/AnalysisSeenMarker.tsx` | Create |
| `components/NetworkMap.tsx` | Create |
| `app/page.tsx` | Modify |

Package install: `bun add @dagrejs/dagre`

---

## Verification

1. `bun run dev` — app starts, no type errors
2. Configure a Claude API key at `/analysis`
3. Ensure at least one DC node has a non-null `results` value in the DB
4. Click "Run Analysis" → success message shows node/edge counts
5. Home page renders React Flow canvas with labelled nodes and edges
6. Clicking a node opens side panel with device metadata
7. Navbar bell shows red dot after analysis; dot clears on next home page load
8. Run `bun run build` — no build errors
9. `bun run test` — unit tests for prompt-builder, schemas, and analysis-results repo
