# NetMap

Network topology capture and visualization tool. Connects to routers, switches, and WLAN infrastructure via SSH or API, feeds the collected data to an LLM for analysis, and renders the resulting topology as an interactive graph.

## Features

### Data Collection
- SSH-based collection from network devices (Cisco CLI commands: `show run brief`, CDP/LLDP neighbours, routing tables, interface summaries)
- API-based collection via HTTP fetch for devices that expose a REST interface
- Configurable command set per DC Node, stored as a JSON array
- Enable/disable toggle per node
- Configurable schedule (daily or weekly at a chosen time) plus an on-demand run button

### Analysis
Named, reusable analysis configurations — pick a provider and model, save once, reuse across runs.

**Supported LLM providers:**
| Provider | Models |
|---|---|
| Claude (Anthropic) | Sonnet 4, Haiku 4.5, Opus 4 |
| Google AI Studio | Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash |
| Local Model — Ollama | Any model installed locally; fetched live from the server |
| Local Model — vLLM | Any served model; OpenAI-compatible API |
| Local Model — LM Studio | Any loaded model; OpenAI-compatible API |
| Local Model — TensorRT-LLM | Any served model; OpenAI-compatible API |
| Local Model — Jan.ai | Any loaded model; OpenAI-compatible API |
| Local Model — NVIDIA NIM | Any NIM-served model; OpenAI-compatible API |

- Local model runs execute in the background with a 20-minute timeout; cloud runs are synchronous
- Results named `<config> – YYYY-MM-DD HH:mm`, browseable and deletable
- Capped at 100 stored results (oldest auto-deleted)
- Full API call log per config (request, response, status, duration)

### Network Visualization
- React Flow canvas with dagre automatic layout
- Result selector dropdown — switch between stored analysis runs
- Click any node or edge to open a metadata side panel
- Delete individual results
- Layout state persisted per result

## Tech Stack

- **Next.js 15** (App Router) + **Bun** runtime
- **TypeScript**
- **TailwindCSS v4**
- **SQLite** via Bun's built-in client (raw SQL, no ORM)
- **ssh2** for SSH sessions
- **React Flow** (`@xyflow/react`) + **dagre** for visualization
- **Zod** for input validation
- **Vitest** for tests

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database (`data/app.db`) is created automatically on first run. No migration step needed.

## Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
bun run test         # Run tests once
bun run test:watch   # Run tests in watch mode
```

## Project Structure

```
app/
  page.tsx                        # Network Maps viewer
  analysis/
    actions.ts                    # LLM routing (Claude / Google / local)
    configs/                      # Analysis config CRUD pages + actions
  dc-nodes/                       # DC Node management pages + actions
components/                       # All UI components
lib/
  db.ts                           # SQLite singleton + helpers
  analysis-configs.ts             # Analysis config CRUD
  analysis-results.ts             # Result storage (100-cap)
  api-call-logs.ts                # API call log storage
  dc-nodes.ts                     # DC Node CRUD
  prompt-builder.ts               # LLM prompt construction
  schemas.ts                      # Zod validation schemas
  settings.ts                     # Key-value settings
_specs/                           # Feature specs
_plans/                           # Implementation plans
data/app.db                       # SQLite database (gitignored)
```

## Notes

- No authentication — intended for internal/local use
- SSH credentials and LLM API keys are stored in plaintext in SQLite; do not expose the database file
- Local model server URLs must be reachable from the Next.js server process (not the browser)
