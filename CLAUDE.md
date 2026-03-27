# CLAUDE.md

We're building the app described in @SPEC.md. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
bun run test         # Run tests once (Vitest)
bun run test:watch   # Run tests in watch mode
```

Always use Bun (not npm/npx/yarn) for running scripts and installing packages.

## Architecture

**NetMap** is a network topology capture and visualization app.

### Stack
- **Next.js 15** with App Router (Bun runtime)
- **SQLite** via Bun's built-in SQLite client — raw SQL only, no ORM
- **React Flow** (`@xyflow/react`) + **dagre** (`@dagrejs/dagre`) for network visualization with auto-layout
- **TailwindCSS v4** for styling
- **ssh2** for SSH-based data collection from network devices
- **Vitest** for testing
- **Zod** for schema validation
- **nanoid** for ID generation

### Three Core Modules

1. **Data Collection** — SSH sessions (via ssh2) and API calls (fetch) to gather config/topology data from routers, switches, and WLAN infrastructure. Credentials and results are stored in the `dc_nodes` SQLite table.

2. **Analysis** — Named, reusable analysis configurations select the LLM provider and model. Supported providers: Claude (Anthropic) and Google AI Studio. Results are stored with a name (`<config> – YYYY-MM-DD HH:mm`), capped at 100. API calls are logged per config.

3. **Network Visualization** — React Flow canvas with dagre auto-layout. The Network Maps viewer (`/`) lets users switch between stored results, delete results, and click nodes/edges for metadata.

### File Structure

```
lib/db.ts                  # Bun SQLite singleton + query/get/run helpers
lib/dc-nodes.ts            # DC Node CRUD
lib/analysis-configs.ts    # Analysis config CRUD
lib/analysis-results.ts    # Analysis result storage + 100-cap + delete
lib/api-call-logs.ts       # API call log storage + per-config queries
lib/prompt-builder.ts      # Builds LLM prompt from collected node data
lib/schemas.ts             # Zod schemas for all inputs
lib/settings.ts            # Key-value settings helpers
lib/analysis-settings.ts   # Legacy analysis settings (deprecated path)
app/page.tsx               # Network Maps viewer (MapViewer)
app/actions.ts             # Global server actions (mark seen, delete result)
app/analysis/actions.ts    # runAnalysisAction — routes to Claude or Google AI
app/analysis/configs/      # Analysis config CRUD pages + actions
app/dc-nodes/              # DC Node management pages + actions
components/                # All UI components (see SPEC.md §7.3)
data/app.db                # SQLite database file (gitignored)
```

### Database

Single SQLite file at `data/app.db`. Schema is auto-migrated on every `getDb()` call via `initSchema()`. Key tables:

- `dc_nodes` — DC node credentials and last collection results
- `settings` — key-value store (schedule, last_analysis_id, last_seen_analysis_id)
- `analysis_configs` — named LLM configurations (provider, model, key, etc.)
- `analysis_results` — stored analysis results with graph data (capped at 100)
- `api_call_logs` — full request/response log per LLM call, linked to config

### DB Helper Pattern (`lib/db.ts`)

```typescript
getDb()                        // returns singleton Database connection
query<T>(sql, ...params): T[]
get<T>(sql, ...params): T | undefined
run(sql, ...params)
```

**Important:** Always use the exported `run()` helper inside `getDb().transaction()` callbacks — never call `db.run()` directly, as `Database.run()` expects array params, not variadic args.

### Analysis — LLM API Routing

`runAnalysisAction` in `app/analysis/actions.ts` branches on `config.provider`:
- `"claude"` → `POST {baseUrl}/v1/messages` with `x-api-key` + `anthropic-version` headers
- `"google"` → `POST {baseUrl}/v1beta/models/{model}:generateContent` with `x-goog-api-key` header

Both paths strip markdown fences from responses before JSON parsing.

### Schema Migration Pattern

Use `PRAGMA table_info(table_name)` to check column existence before `ALTER TABLE` — do **not** use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (requires SQLite 3.37+, not guaranteed).

### Security Notes
- Sanitize and validate all user input (IP addresses, hostnames) before DB writes or SSH connections
- SSH credentials and LLM API keys are stored in plaintext in SQLite for now — treat as sensitive
