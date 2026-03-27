# Spec for Data Analysis via Claude API

branch claude/feature/data-analysis-claude-api

## Summary

When a user triggers analysis, the app collects all stored DC node results from SQLite and sends them to the Claude API with a structured system prompt. Claude returns a network map describing all discovered components and their relationships. The response is persisted locally and converted into a React Flow-compatible data structure that the visualization layer can render directly.

## Functional requirements

- A "Run Analysis" action (button or API route) reads all `dc_nodes` rows where `results` is not null and bundles the JSON results into a single prompt payload.
- The system prompt instructs Claude to act as a network topology analyst and return a structured JSON object (nodes + edges) describing the discovered network.
- The Claude API call uses the provider settings already configured on the `/analysis` page (API key, model, max tokens, optional base URL).
- The structured JSON response from Claude is validated against a Zod schema before being persisted.
- Persisted analysis results are stored in SQLite in a new `analysis_results` table (id, created_at, raw_response TEXT, graph_data TEXT as JSON).
- The most recent analysis result is exposed via a server action / API route so the React Flow visualization page can load it.
- The `/` (home) page renders the network map from the latest analysis result using React Flow nodes and edges.
- The navbar shows a notification badge when a new analysis result is available but the user has not yet viewed it.

## System prompt specification

The system prompt sent to Claude must:

1. Establish the role: "You are a network topology analyst. You will receive raw CLI output and/or API responses collected from network devices."
2. Describe the task: "Analyse the provided data and identify all network components (routers, switches, access points, hosts, VLANs, links) and the relationships between them."
3. Define the required output format explicitly as a JSON object with two top-level arrays:
   - `nodes`: each entry has `id` (string), `type` (one of `router`, `switch`, `ap`, `host`, `vlan`, `unknown`), `label` (string), and `data` (object with arbitrary device metadata such as IP addresses, MAC, model, interfaces).
   - `edges`: each entry has `id` (string), `source` (node id), `target` (node id), `label` (optional string describing the link, e.g. interface name or VLAN), and `data` (object with link metadata).
4. Instruct Claude to return **only** the JSON object, with no surrounding prose or markdown fences.
5. Include a reminder that unknown or ambiguous components should be included with `type: "unknown"` rather than omitted.

## React Flow compatibility

- The `nodes` array maps directly to React Flow `Node` objects: `id`, `type`, `data`, and a default `position` `{ x: 0, y: 0 }` (layout can be applied client-side via a dagre or ELK auto-layout pass).
- The `edges` array maps directly to React Flow `Edge` objects: `id`, `source`, `target`, optional `label`.
- The client-side visualization component applies an automatic layout (e.g. dagre) on first render so nodes are not stacked.

## Data storage

- New SQLite table `analysis_results`:
  ```
  id          TEXT PRIMARY KEY
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  raw_response TEXT NOT NULL   -- full Claude API response body
  graph_data  TEXT NOT NULL   -- validated JSON {nodes, edges}
  ```
- Only the latest result is shown in the UI; older results are retained for audit purposes.
- A repository helper `lib/analysis-results.ts` exposes `saveAnalysisResult`, `getLatestAnalysisResult`, and `listAnalysisResults`.

## Possible edge cases

- Claude returns malformed or non-JSON output: validation fails, error is shown to the user, nothing is persisted.
- No DC nodes have results yet: the run is blocked with a clear message ("No collected data available — run data collection first").
- Claude API key is missing or invalid: surface the API error clearly and link to `/analysis` to reconfigure.
- Very large `results` payloads may exceed Claude's context window: the prompt builder should truncate or summarise per-node data if the estimated token count exceeds `maxTokens * 0.8`.
- Multiple simultaneous analysis runs: prevent concurrent runs with a simple in-progress flag (stored in SQLite or in-memory).

## Acceptance criteria

- Clicking "Run Analysis" with valid config and collected data produces a persisted `analysis_results` row within a reasonable time.
- The home page renders a React Flow canvas with nodes and edges derived from the latest analysis result.
- Each React Flow node displays at minimum the device label and type; clicking a node shows its full `data` metadata in a side panel or tooltip.
- If no analysis has been run yet, the home page shows an empty state with a prompt to run analysis.
- A failed analysis (API error or validation error) shows a user-facing error message and does not corrupt existing results.
- The navbar badge appears after a new analysis result is saved and clears once the user visits the home page.

## Open questions

- Should older analysis results be browsable in the UI (history view), or is only the latest result exposed?
- Should the prompt include a diff from the previous analysis to help Claude identify topology changes?
- Is a manual "Run Analysis" trigger sufficient, or should periodic/scheduled analysis also be supported?
- Should the auto-layout algorithm (dagre vs ELK) be configurable, or is one default acceptable?

## Testing guidelines

- Unit test the system prompt builder: given sample `dc_nodes` results, verify the constructed prompt contains the expected device data.
- Unit test the Zod schema for the Claude response: valid and invalid payloads, edge cases like empty nodes/edges arrays.
- Unit test the repository helpers in `lib/analysis-results.ts` against a real in-memory SQLite instance.
- Integration test the full analysis flow with a mocked Claude API (intercept the HTTP call, return a fixture response) and assert a row is inserted into `analysis_results`.
- UI test: render the home page with a fixture `graph_data` value and assert React Flow nodes and edges appear in the DOM.
