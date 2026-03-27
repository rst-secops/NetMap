# Technical Specification – NetMap

## 1. Overview

We are developing an app that can capture and visualize the logical structure of a network consisting of routers, switches, and WLAN infrastructure. The app consists of three parts: data collection, analysis, and visualization.

### Core Features

- **Data Collection (DC)** – Reading configuration files, CDP and LLDP information, routing tables, and potentially other helpful data directly from the network components. We provide a default set of commands executed during data collection runs, stored as a JSON array in the database and editable during DC Node configuration. Data is captured via SSH sessions in which CLI commands are executed. Alternatively, API interfaces are used if available. The `dc_nodes` database table stores all DC Node credentials (see Configuration) and the results of the last collection run as JSON. Data Collection runs on a configurable schedule.

- **Analysis** – The analysis of the collected information forms the basis for visualization. Named, reusable analysis configurations allow different LLM providers and models to be selected per run. Analysis results are stored with a human-readable name (derived from the config name and timestamp) and can be browsed, compared, and deleted. The analysis should also identify potential new data collection nodes and surface these findings via notifications in the navbar. Analysis results must be stored in a format natural to React Flow for efficient, smooth visualization. Up to 100 results are retained; oldest are auto-deleted beyond the cap.

- **Network Visualization** – Graphical display of captured network components and their relationships/connections via the Network Maps viewer. Users can switch between stored analysis results using a dropdown, delete results, zoom/pan the canvas, and click nodes or edges for detailed metadata. Visualization is built with React Flow and uses dagre for automatic layout.

- **Configuration** – Setup for collecting network information with the option to define SSH- or API-based DC Nodes. All saved DC Nodes and their credentials are stored for future data collection and queried on the next run. Includes a global schedule for data collection (daily/weekly, time of run) and a button to kick off a run immediately. Analysis configurations are managed separately under Data Analysis.

### Tech Stack

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS v4
- SQLite via Bun's built-in SQLite client with raw SQL
- ssh2 package for SSH-based data collection
- Built-in fetch API for API-based data collection and LLM calls
- React Flow (`@xyflow/react`) for visualization
- dagre (`@dagrejs/dagre`) for automatic graph layout
- Zod for input validation
- nanoid for ID generation

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching, analysis, and storage
  - Client components for interactive UI and visualization
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (`data/app.db`) accessed via Bun's built-in SQLite client

### 2.2 Application Layers

**Data Collection Layer**
- Reads DC Node credentials from SQLite
- Connects to devices via ssh2 (SSH) or fetch (API)
- Stores collected data back to SQLite

**Data Storage Layer**
- Raw SQL queries via Bun's SQLite client

**Presentation Layer**
- Next.js pages and components
- TailwindCSS for styling
- React Flow for network visualization

**Data Access Layer**
- Raw SQL queries via Bun's SQLite client
- A small helper module (`lib/db.ts`) for DB access

## 3. Functional Requirements

### 3.1 Authentication

Authentication is not required for now; may be implemented later.

### 3.2 DC Node Management

**List of configured DC Nodes**
- Default page when selecting Data Collection in the navbar
- Table with columns: name, host/IP, type, enabled toggle, edit and delete buttons
- Toggle switch to enable/disable each DC Node

**Create a new DC Node:**
- Default name: "Untitled node"
- Selection menu for SSH or API-based DC
- Default empty Hostname/IP Address field
- Default empty SSH or API credentials
- Default commands pre-populated from default set
- Switch for enable/disable

**Update/View DC Node:**
- Change name, host, credentials, commands
- View results from last collection run

**Delete DC Node:**
- Hard delete with confirmation

### 3.3 Analysis Configuration Management

**List of analysis configurations** (`/analysis/configs`)
- Table with columns: name, provider, model, max tokens, default flag, edit and delete buttons
- Star icon marks the default config; clicking a hollow star sets that config as default
- "Run Analysis" card above the list: config selector dropdown + run button

**Create / Edit an analysis configuration** (`/analysis/configs/new`, `/analysis/configs/[id]/edit`)
- Fields: Config Name, LLM Provider (dropdown), Model (dropdown, updates when provider changes), Max Tokens, API Base URL (optional override), API Key (password field with masked display on edit), Set as Default (checkbox)
- Edit page also shows the API call log for that config

**Delete an analysis configuration:**
- Hard delete with confirmation; last config cannot be deleted
- If deleted config was the default, the oldest remaining config is promoted

**Supported LLM providers:**
- **Claude (Anthropic)** — models: Claude Sonnet 4, Claude Haiku 4.5, Claude Opus 4
- **Google AI Studio** — models: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash

### 3.4 Network Maps Viewer

**Map viewer** (`/`)
- Displays the most recent analysis result by default
- Dropdown at top-left to switch between all stored results (named `<config> – YYYY-MM-DD HH:mm`)
- Node/edge count and timestamp shown in the toolbar
- Delete button at top-right: confirmation dialog, then deletes the selected result
- Empty state with link to `/analysis/configs` when no results exist
- Clicking a node or edge opens a side panel with full metadata

## 4. Non-Functional Requirements

**Performance**
- Node list and node detail views should load in under ~300 ms for typical DB sizes

**Security**
- Authentication not required at this stage

**Reliability**
- Graceful handling of DB errors

**UX**
- Simple, minimal, modern UI

## 5. Data Model & Database Schema (SQLite)

### 5.1 Tables

#### dc_nodes

```sql
CREATE TABLE IF NOT EXISTS dc_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL DEFAULT 'SSH',
  node_display_name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  commands TEXT NOT NULL DEFAULT '["show run brief","show cdp nei","show ip route","show ip int brief"]',
  node_user TEXT NOT NULL,
  node_passwd TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  results TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### settings

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Seeded keys: `dc_schedule_type`, `dc_schedule_time`, `last_analysis_id`, `last_seen_analysis_id`.

#### analysis_configs

```sql
CREATE TABLE IF NOT EXISTS analysis_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'claude',
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### analysis_results

```sql
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  config_name TEXT NOT NULL DEFAULT '',
  raw_response TEXT NOT NULL,
  graph_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Capped at 100 rows; oldest are deleted on insert beyond the limit.

#### api_call_logs

```sql
CREATE TABLE IF NOT EXISTS api_call_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  config_id TEXT NOT NULL DEFAULT '',
  request_body TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 5.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_dc_nodes_display_name ON dc_nodes(node_display_name);
```

## 6. Backend: DB

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize Bun SQLite client with DB file (`data/app.db`)
- Run `initSchema()` on first connection — creates all tables, applies `ALTER TABLE` migrations via `PRAGMA table_info`, seeds default settings, and migrates any legacy global Claude config into `analysis_configs`
- Export helper functions:
  - `getDb()` – returns singleton DB connection
  - `query<T>(sql, ...params): T[]`
  - `get<T>(sql, ...params): T | undefined`
  - `run(sql, ...params)`

### 6.2 DC Node Repository

**File:** `lib/dc-nodes.ts`

- `getAllNodes(): DcNode[]`
- `getNodeById(id): DcNode | undefined`
- `createNode(data): DcNode`
- `updateNode(id, data): DcNode | undefined`
- `deleteNode(id): void`
- `toggleNodeEnabled(id, isEnabled): DcNode | undefined`

### 6.3 Analysis Config Repository

**File:** `lib/analysis-configs.ts`

- `getAllConfigs(): AnalysisConfig[]`
- `getConfigById(id): AnalysisConfig | undefined`
- `getDefaultConfig(): AnalysisConfig | undefined`
- `createConfig(data): AnalysisConfig` — clears all defaults first when `isDefault` is true; wrapped in a DB transaction
- `updateConfig(id, data): AnalysisConfig | undefined` — dynamic SET clause; promotes oldest other config when unsetting default; transaction
- `deleteConfig(id): void` — refuses to delete last config; promotes oldest other when deleting default; transaction
- `setDefaultConfig(id): void` — transaction: clear all, set target

### 6.4 Analysis Results Repository

**File:** `lib/analysis-results.ts`

- `saveAnalysisResult(rawResponse, graphData, name, configName): AnalysisResult` — inserts, then enforces 100-row cap
- `getLatestAnalysisResult(): AnalysisResult | undefined`
- `listAnalysisResults(): AnalysisResult[]` — newest first
- `deleteAnalysisResult(id): void`

### 6.5 API Call Logs

**File:** `lib/api-call-logs.ts`

- `saveApiCallLog(log): void`
- `listApiCallLogs(limit?): ApiCallLog[]`
- `listApiCallLogsByConfigId(configId, limit?): ApiCallLog[]`

### 6.6 Prompt Builder

**File:** `lib/prompt-builder.ts`

Builds `systemPrompt` and `userMessage` from collected DC node data. Input budget is fixed at 400,000 characters (decoupled from LLM output token limit) to avoid truncating multi-node data.

## 7. Frontend – Pages & Components

### 7.1 Routes

```
/                              – Network Maps viewer (map + result selector)
/dc-nodes                      – DC Node list
/dc-nodes/new                  – Create DC Node
/dc-nodes/[id]                 – View DC Node + last collection results
/dc-nodes/[id]/edit            – Edit DC Node
/analysis                      – Redirects to /analysis/configs
/analysis/configs              – Analysis config list + Run Analysis card
/analysis/configs/new          – Create analysis config
/analysis/configs/[id]/edit    – Edit analysis config + API call log
```

### 7.2 Layout & Navigation

- Global layout: `app/layout.tsx`
- Navbar (left to right): NetMap logo → **Network Maps** (`/`) → **Data Collection** (`/dc-nodes`) → **Data Analysis** (`/analysis/configs`)
- Right side of navbar: notification bell (new analysis indicator)

### 7.3 Components

| Component | Description |
|---|---|
| `NetworkMap` | React Flow canvas with dagre auto-layout, custom device nodes, side panel for node/edge metadata |
| `MapViewer` | Client wrapper: result selector dropdown, delete button + dialog, passes selected graph to `NetworkMap` |
| `ConfigList` | Table of analysis configs with default-star toggle, edit link, delete button |
| `ConfigForm` | Create/edit form for analysis configs; provider dropdown drives model list dynamically |
| `DeleteConfigButton` | Confirmation dialog + `deleteConfigAction` |
| `RunAnalysisCard` | Config selector + run button, shows last result info |
| `ApiCallLogsCard` | Collapsible list of API calls with request/response JSON, status badge, duration |
| `NodeList` | Table of DC nodes with enable toggle, edit link, delete button |
| `NodeForm` | Create/edit form for DC nodes |
| `DeleteNodeButton` | Confirmation dialog + `deleteNodeAction` |
| `EnableToggle` | Checkbox toggle for `isEnabled` |
| `ScheduleCard` | Data collection schedule configuration |

## 8. Analysis – LLM Integration

### 8.1 API Call Routing (`app/analysis/actions.ts`)

`runAnalysisAction` reads `configId` from form data (falls back to default config), builds the prompt via `buildPrompt()`, then routes to the correct LLM API:

**Claude (Anthropic)**
- Endpoint: `POST {baseUrl}/v1/messages`
- Auth: `x-api-key` header + `anthropic-version: 2023-06-01`
- Request: `{ model, max_tokens, system, messages: [{role: "user", content}] }`
- Response text: `body.content[0].text`

**Google AI Studio**
- Endpoint: `POST {baseUrl}/v1beta/models/{model}:generateContent`
- Auth: `x-goog-api-key` header
- Request: `{ systemInstruction: {parts: [{text}]}, contents: [{role: "user", parts: [{text}]}], generationConfig: {maxOutputTokens} }`
- Response text: `body.candidates[0].content.parts[0].text`

Both paths log the call to `api_call_logs`, strip markdown fences from the response, validate against `networkGraphSchema`, and save the result.

## 9. Styling (TailwindCSS)

- TailwindCSS v4 with PostCSS plugin (configured via `@tailwindcss/postcss`)
- Minimal design: neutral background, card-like containers
- Dark theme as default

## 10. Security Considerations

**Authentication/Authorization**
- Not required at this stage

**Input Validation**
- Sanitize all user input during DC Node creation and updates
- Validate IP addresses, hostnames, and port numbers via Zod schemas
- Analysis config inputs validated via `analysisConfigSchema`

**Credential Storage**
- SSH/API credentials and LLM API keys stored in plaintext in SQLite for now
- Database file should not be committed to version control

## 11. Development Workflow

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS
3. Implement SQLite DB initialization (auto-migration on first `getDb()` call)
4. Build DB helpers and DC Node repository
5. Build DC Nodes management pages (list, create, edit)
6. Build home page with React Flow network visualization
7. Implement data collection engine (SSH/API)
8. Implement analysis layer with named configs and multi-provider support
9. Build Network Maps viewer with result switching and deletion
10. Add polish (loading states, toast messages, error handling)
