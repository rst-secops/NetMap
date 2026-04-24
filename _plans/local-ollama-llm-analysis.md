# Plan: Local Ollama LLM Analysis

## Context

The app supports two cloud-based LLM providers (Claude, Google AI). This plan adds a third provider — a locally hosted Ollama instance — so that analysis can run entirely on-premises without sending data to external APIs. Ollama exposes a REST API for listing installed models and running chat completions. The feature should feel identical to the existing cloud providers from a UX perspective, with the key difference that models are fetched dynamically from the Ollama server rather than from a static list.

No DB schema changes are needed — the existing `provider`, `model`, `base_url`, and `api_key` columns already cover all required fields.

---

## Implementation order

### 1. Extend Zod schema — `lib/schemas.ts`

- Add `"ollama"` to the provider enum: `z.enum(["claude", "google", "ollama"])`
- Add a `.superRefine()` rule: when `provider === "ollama"`, `baseUrl` must be non-empty
- `apiKey` remains optional (empty string allowed) for all providers — Ollama deployments typically need no auth

### 2. New server action: fetch Ollama models — `app/analysis/configs/actions.ts`

Add `fetchOllamaModelsAction(baseUrl: string): Promise<{ models?: string[]; error?: string }>`:

- Validates `baseUrl` is non-empty before making the request
- `GET {baseUrl}/api/tags` with a 5-second timeout
- On success: returns `{ models: data.models.map(m => m.name) }`
- On network error or non-200: returns `{ error: "…" }`

### 3. ConfigForm UI — `components/ConfigForm.tsx`

- Add `"Ollama (Local)"` option to the provider `<select>` (value: `"ollama"`)
- When `provider === "ollama"`:
  - Base URL field moves above the model section and is marked required; placeholder `http://192.168.1.100:11434`
  - Static model dropdown is replaced by a **"Fetch Models"** button + a select that starts empty
  - Clicking "Fetch Models" calls `fetchOllamaModelsAction` with the current `baseUrl` value, shows a loading state, and populates the dropdown on success or shows an inline error on failure
  - If the user changes `baseUrl` after fetching, the model list resets to empty (stale state cleared)
  - API key field remains visible but is labelled optional

### 4. Analysis routing — `app/analysis/actions.ts`

Add an `"ollama"` branch in `runAnalysisAction`:

- Endpoint: `POST {config.baseUrl}/api/chat`
- Headers: `Content-Type: application/json` + `Authorization: Bearer {config.apiKey}` only when `apiKey` is non-empty
- Body:
  ```json
  {
    "model": "<config.model>",
    "messages": [
      { "role": "system", "content": "<systemPrompt>" },
      { "role": "user",   "content": "<userMessage>" }
    ],
    "stream": false,
    "options": { "num_predict": <config.maxTokens> }
  }
  ```
- Response parsing: `responseBody?.message?.content`
- Strip markdown fences (same utility as other providers)
- **No `AbortSignal.timeout()` on the fetch** — local models can be slow; the request must wait as long as needed

### 4a. Route segment timeout — `app/analysis/configs/page.tsx`

Add `export const maxDuration = 300;` at the top of the file. This tells Next.js (and any compatible hosting platform) that server actions triggered from this route may run for up to 5 minutes. Without this, platforms like Vercel kill requests after 10 seconds by default.

Note: `fetchOllamaModelsAction` (the `/api/tags` call) keeps its short 5s `AbortSignal.timeout()` — it is a quick metadata call and should fail fast if the server is unreachable.

### 5. Relax apiKey guard — `app/analysis/configs/actions.ts`

In `createConfigAction` and `updateConfigAction`, the existing check that rejects an empty `apiKey` must be skipped when `provider === "ollama"`.

---

## Critical files

| File | Change |
|---|---|
| `lib/schemas.ts` | Add `"ollama"` to provider enum; cross-field refine for baseUrl |
| `components/ConfigForm.tsx` | Add provider option; dynamic model-fetch UI |
| `app/analysis/configs/actions.ts` | `fetchOllamaModelsAction`; relax apiKey guard |
| `app/analysis/actions.ts` | Ollama branch in `runAnalysisAction` (no fetch timeout) |
| `app/analysis/configs/page.tsx` | `export const maxDuration = 300` |

---

## Verification

1. `bun run dev` — open config create page, select "Ollama (Local)", confirm UI adapts
2. Enter a real Ollama server URL, click "Fetch Models", confirm dropdown populates with installed models
3. Test error path: enter an invalid URL, confirm inline error appears
4. Save config, run analysis, confirm result stored and visible in map viewer
5. Check `api_call_logs` table for the Ollama entry
6. `bun run lint` — no type errors
7. `bun run test` — existing tests still pass
