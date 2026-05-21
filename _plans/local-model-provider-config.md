# Plan: local-model-provider-config

## Summary

Redesign the "Ollama (Local)" LLM provider option into a unified "Local Model" provider that supports multiple local inference backends. Users select "Local Model" as the provider type, then choose a specific backend (Ollama, vLLM, LM Studio, TensorRT-LLM, or Jan.ai). The config form adapts to each backend's connection requirements. Model selection remains dynamic — fetched live from the running local server.

## Background

The app currently supports three providers: `claude`, `google`, and `ollama`. The `ollama` provider has its own API format (`POST /api/chat`, `GET /api/tags`), while vLLM, LM Studio, TensorRT-LLM, and Jan.ai all expose OpenAI-compatible APIs (`POST /v1/chat/completions`, `GET /v1/models`).

### Key files

| File | Role |
|------|------|
| `components/ConfigForm.tsx` | Provider dropdown, backend sub-dropdown, model fetch UI |
| `app/analysis/configs/actions.ts` | `fetchOllamaModelsAction` → needs to become `fetchLocalModelsAction` |
| `app/analysis/actions.ts` | `performAnalysis` — routes to correct API format per provider |
| `lib/schemas.ts` | Zod schema: provider enum, new `local_backend` field |
| `lib/db.ts` | `initSchema()` — add `local_backend` column migration |
| `lib/analysis-configs.ts` | CRUD — include `local_backend` in read/write |

## Implementation plan

### 1. DB schema migration (`lib/db.ts`)

Add `local_backend TEXT DEFAULT 'ollama'` to `analysis_configs` via `PRAGMA table_info` guard (consistent with existing migration pattern).

### 2. Zod schema (`lib/schemas.ts`)

- Add `local_backend` field: `z.enum(["ollama", "vllm", "lmstudio", "tensorrt", "janai"]).optional()`
- Extend provider enum to include `"local"` alongside `"claude"`, `"google"`, `"ollama"` (keep `"ollama"` for backward compat with existing rows)
- Add cross-field refinement: when `provider === "local"`, `local_backend` is required

### 3. DB CRUD (`lib/analysis-configs.ts`)

- Include `local_backend` in `INSERT` / `UPDATE` / `SELECT` queries
- Normalise on read: map `provider="ollama"` → `provider="local", local_backend="ollama"` so the UI always sees the unified shape

### 4. Server action — model fetching (`app/analysis/configs/actions.ts`)

Rename `fetchOllamaModelsAction` → `fetchLocalModelsAction`. Branch by `local_backend`:
- `ollama` → `GET {serverUrl}/api/tags` → extract `data.models[].name`
- `vllm | lmstudio | tensorrt | janai` → `GET {serverUrl}/v1/models` → extract `data.data[].id`

### 5. Analysis execution (`app/analysis/actions.ts`)

Add a branch for `provider === "local"` (and backward compat `"ollama"`):
- `local_backend === "ollama"` → existing Ollama chat format (`POST /api/chat`)
- all other backends → OpenAI chat completions format (`POST /v1/chat/completions`)

### 6. Config form UI (`components/ConfigForm.tsx`)

- Rename "Ollama" dropdown option label to "Local Model" (value stays `"local"` for new entries)
- When `provider === "local"`, render a "Backend" `<select>` below it with the five backend options
- Replace `fetchOllamaModelsAction` call with `fetchLocalModelsAction`, pass `local_backend`
- Backend-specific URL placeholders:
  - Ollama: `http://localhost:11434`
  - vLLM: `http://localhost:8000`
  - LM Studio: `http://localhost:1234`
  - TensorRT-LLM: `http://localhost:8000`
  - Jan.ai: `http://localhost:1337`
- Manual text entry fallback when model fetch fails

### 7. Config list (`components/ConfigList.tsx`)

Update badge/label rendering: for `provider === "local"`, display `"Local – {BackendLabel}"` (e.g. "Local – vLLM").

## Backward compatibility

Existing rows with `provider="ollama"` need no data migration. The read-normalisation in step 3 maps them to the unified shape. The Zod schema keeps `"ollama"` in the provider enum so validation still passes when editing legacy configs.

## Verification

1. `bun run dev` → open `/analysis/configs/new`
2. Select "Local Model" → confirm Backend dropdown appears
3. Set backend to Ollama, enter server URL, click "Fetch Models" → model list populates
4. Save config, run analysis → check `api_call_logs` for correct endpoint and payload format
5. Edit an existing ollama config → loads without error, saves correctly
6. Repeat "Fetch Models" with vLLM/LM Studio if available; verify `GET /v1/models` is called
