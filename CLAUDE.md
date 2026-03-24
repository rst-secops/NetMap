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

**NetMap** is a network topology capture and visualization app. It is in early development — the specification is defined in `SPEC.md` and `spec-de.txt`, but most implementation is pending.

### Stack
- **Next.js 15** with App Router (Bun runtime)
- **SQLite** via Bun's built-in SQLite client — raw SQL only, no ORM
- **React Flow** (`@xyflow/react`) for network visualization
- **TailwindCSS v4** for styling
- **ssh2** for SSH-based data collection from network devices
- **Vitest** for testing
- **Zod** for schema validation
- **nanoid** for ID generation

### Three Core Modules

1. **Data Collection** — SSH sessions (via ssh2) and API calls (fetch) to gather config/topology data from routers, switches, and WLAN infrastructure. Credentials and results are stored in the `dc-nodes` SQLite table.

2. **Analysis** — Processes collected data to extract network relationships. May use a private LLM. Should detect potential new DC nodes and surface them as navbar notifications. Outputs must be React Flow-compatible.

3. **Network Visualization** — React Flow canvas showing network topology with Layer 2/3 view switching. Nodes are interactive (zoom, pan, click for details).

### Planned File Structure

```
lib/db.ts          # Bun SQLite singleton + query/get/run helpers
lib/dc-nodes.ts    # DC Node repository functions (CRUD + toggleEnabled)
app/page.tsx       # Home — network topology view
app/dc-nodes/      # DC Node management pages
components/        # NodeList, EnableToggle, DeleteNodeButton
data/app.db        # SQLite database file (gitignored)
```

### Database

Single SQLite file at `data/app.db`. The main table is `dc_nodes`:

```sql
CREATE TABLE dc_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL DEFAULT 'SSH',
  node_display_name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  commands TEXT NOT NULL,    -- JSON array of CLI commands
  node_user TEXT NOT NULL,
  node_passwd TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  results TEXT,              -- JSON from last collection run
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

TypeScript uses camelCase (`nodeType`, `nodeDisplayName`, etc.) mapped to snake_case SQL columns in the repository layer.

### DB Helper Pattern (`lib/db.ts`)

```typescript
getDb()               // returns singleton Database connection
query<T>(sql, params?): T[]
get<T>(sql, params?): T | undefined
run(sql, params?)
```

### Security Notes
- Sanitize and validate all user input (IP addresses, hostnames) before DB writes or SSH connections
- SSH credentials are stored in plaintext in SQLite for now — treat as sensitive
