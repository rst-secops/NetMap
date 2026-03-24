# Technical Specification – NetMap

## 1. Overview

We are developing an app that can capture and visualize the logical structure of a network consisting of routers, switches, and WLAN infrastructure. The app consists of three parts: data collection, analysis, and visualization.

### Core Features

- **Data Collection (DC)** – Reading configuration files, CDP and LLDP information, routing tables, and potentially other helpful data directly from the network components. We provide a default set of commands executed during data collection runs, stored as a JSON array in the database and editable during DC Node configuration. Data is captured via SSH sessions in which CLI commands are executed. Alternatively, API interfaces are used if available. The `dc_nodes` database table stores all DC Node credentials (see Configuration) and the results of the last collection run as JSON. Data Collection runs on a configurable schedule.

- **Analysis** – The analysis of the collected information forms the basis for visualization. An internal model stores the identified network relationships and makes them available for visualization. The analysis can utilize AI functions from a private LLM infrastructure where it makes sense. It should also identify potential new data collection nodes and surface these findings via notifications in the navbar. Analysis results must be stored in a format natural to React Flow for efficient, smooth visualization.

- **Network Visualization** – Graphical display of captured network components and their relationships/connections. The visualization supports switching between Layer 2 and Layer 3 views using React Flow. Users can zoom in/out, pan, and click individual network nodes to display additional details.

- **Configuration** – Setup for collecting network information with the option to define SSH- or API-based DC Nodes. All saved DC Nodes and their credentials are stored for future data collection and queried on the next run. Includes a global schedule for data collection (daily/weekly, time of run) and a button to kick off a run immediately.

### Tech Stack

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS
- SQLite via Bun's built-in SQLite client with raw SQL
- ssh2 package for SSH-based data collection
- Built-in fetch API for API-based data collection
- React Flow (`@xyflow/react`) for visualization
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

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each node (primary key, nanoid) |
| node_type | TEXT | Node type: `'SSH'` or `'API'` |
| node_display_name | TEXT | User-chosen display name |
| host | TEXT | Node's IP address or hostname |
| port | INTEGER | Connection port (default 22 for SSH) |
| commands | TEXT | JSON array of CLI commands for data collection |
| node_user | TEXT | SSH/API session username |
| node_passwd | TEXT | SSH/API session password |
| is_enabled | INTEGER | Enabled (`1`) or disabled (`0`) for the next collection run |
| results | TEXT | JSON — SSH session output or API responses from last collection run |
| created_at | TEXT | ISO 8601 timestamp of node creation |
| updated_at | TEXT | ISO 8601 timestamp of last modification |

### 5.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_dc_nodes_display_name ON dc_nodes(node_display_name);
```

## 6. Backend: DB

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize Bun SQLite client with DB file (`data/app.db`)
- Export helper functions:
  - `getDb()` – returns singleton DB connection
  - Utility wrappers:
    - `query<T>(sql, params?): T[]`
    - `get<T>(sql, params?): T | undefined`
    - `run(sql, params?)`

### 6.2 DC Node Repository

**File:** `lib/dc-nodes.ts`

**TypeScript type:**

```typescript
export type DcNode = {
  id: string;
  nodeType: string;
  nodeDisplayName: string;
  host: string;
  port: number;
  commands: string;    // JSON array stored as string
  nodeUser: string;
  nodePasswd: string;
  isEnabled: boolean;
  results: string | null;
  createdAt: string;
  updatedAt: string;
};
```

**Repository functions:**

- `getAllNodes(): DcNode[]`
- `getNodeById(id: string): DcNode | undefined`
- `createNode(data: Omit<DcNode, 'id' | 'createdAt' | 'updatedAt'>): DcNode`
- `updateNode(id: string, data: Partial<DcNode>): DcNode | undefined`
- `deleteNode(id: string): void`
- `toggleNodeEnabled(id: string, isEnabled: boolean): DcNode | undefined`

## 7. Frontend – Pages & Components

### 7.1 Routes

Next.js App Router structure:

- `/` – Landing page showing current network topology visualization
- `/dc-nodes` – List of configured Data Collection Nodes

### 7.2 Layout & Navigation

- Global layout: `app/layout.tsx`
  - Header with app name ("NetMap") and theme toggle
  - Navbar with links to home (visualization) and DC Nodes management

### 7.3 Components

**`components/NodeList.tsx`**
- Props: `nodes: { id, nodeDisplayName, host, nodeType, isEnabled }[]`
- Renders table with toggle switches and edit/delete buttons
- Collection run schedule config and "Run Collection Now" button above the table

**`components/EnableToggle.tsx`**
- Switch/checkbox for `isEnabled`

**`components/DeleteNodeButton.tsx`**
- Confirms via dialog, then calls delete

## 8. Styling (TailwindCSS)

- TailwindCSS v4 with PostCSS plugin (configured via `@tailwindcss/postcss`)
- Minimal design: neutral background, card-like containers
- `@tailwindcss/typography` for prose styling of read-only content
- Dark theme as default

## 9. Security Considerations

**Authentication/Authorization**
- Not required at this stage

**Input Validation**
- Sanitize all user input during DC Node creation and updates
- Validate IP addresses, hostnames, and port numbers via Zod schemas

**Credential Storage**
- SSH/API credentials stored in plaintext in SQLite for now
- Database file should not be committed to version control

## 10. Development Workflow

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS
3. Implement SQLite DB initialization (e.g., `scripts/init-db.ts` or auto-migration on first `getDb()` call)
4. Build DB helpers and DC Node repository
5. Build DC Nodes management pages (list, create, edit)
6. Build home page with React Flow network visualization
7. Implement data collection engine (SSH/API)
8. Implement analysis layer
9. Add polish (loading states, toast messages, error handling)
