# Spec for local-model-provider-config

branch claude/feature/local-model-provider-config

## Summary

Redesign the "Ollama (Local)" LLM provider option into a unified "Local Model" provider that supports multiple local inference backends. Users select "Local Model" as the provider type, then choose a specific backend (Ollama, vLLM, LM Studio, TensorRT-LLM, or Jan.ai). The config form adapts to each backend's connection requirements. Model selection remains dynamic — fetched live from the running local server.

## Functional requirements

- Rename the provider option "Ollama" / "Ollama (Local)" to "Local Model" everywhere in the UI (dropdown label, config list, badges).
- When "Local Model" is selected as the provider, show a "Backend" dropdown with options: Ollama, vLLM, LM Studio, TensorRT-LLM, Jan.ai.
- The "Server URL" field remains visible for all local backends (required).
- The "Fetch Models" button fetches available models from the running server using the correct endpoint for the selected backend:
  - Ollama: GET /api/tags
  - vLLM, LM Studio, TensorRT-LLM, Jan.ai: GET /v1/models
- After fetching, the model field is populated with a dropdown of available models.
- If the server is unreachable or returns no models, show a clear error and allow manual text entry as a fallback.
- The API key field remains optional for all local backends (some setups require a Bearer token).
- The "Skip VLANs" option remains available for all local backends.
- The analysis execution routing uses the correct request/response format per backend:
  - Ollama: POST /api/chat (messages array, stream=false)
  - vLLM / LM Studio / TensorRT-LLM / Jan.ai: POST /v1/chat/completions (OpenAI-compatible)
- Existing ollama configs in the database must continue to work without migration (backward compat: treat stored provider="ollama" as provider="local", backend="ollama").
- The provider stored in the DB for new local configs should be "local"; a new "local_backend" column stores the backend type.
- The config list and badges display "Local – Ollama", "Local – vLLM", etc. to distinguish backends.

## Possible edge cases

- Existing configs with provider="ollama" must be read as local/ollama without a DB migration breaking them.
- TensorRT-LLM's model-listing endpoint may vary by deployment; fall back to manual text entry if /v1/models returns 404.
- Jan.ai may require a specific port (default 1337) — the server URL field should not auto-fill but the placeholder can hint at the default.
- Model names fetched from vLLM/LM Studio may include path separators (e.g. `Qwen/Qwen2.5-7B`) — display them as-is.
- The "Fetch Models" action runs server-side; the local server URL must be reachable from the Next.js server process, not the browser.

## Acceptance criteria

- [ ] Provider dropdown shows "Local Model" instead of "Ollama" / "Ollama (Local)".
- [ ] Selecting "Local Model" reveals a "Backend" sub-dropdown with all five options.
- [ ] "Fetch Models" button works for each backend and populates the model dropdown.
- [ ] Manual model text entry is available as a fallback when fetch fails.
- [ ] Analysis runs correctly for each backend (correct API format and endpoint used).
- [ ] Existing ollama configs continue to work after the change (no data loss).
- [ ] Config list shows backend label (e.g. "Local – vLLM") for local configs.
- [ ] DB schema adds a `local_backend` column with migration guarded by PRAGMA table_info check.
- [ ] Zod schema updated to validate provider="local" + local_backend enum.

## Open questions

- Should "Local Model" replace the internal `provider` value stored in the DB, or keep "ollama" for backward compat and only introduce "local" for new entries? (Recommendation: keep "ollama" in DB for existing rows, add "local" for new ones, handle both in query/action layer.) - backward compat is not required, simply replace the value
- Should TensorRT-LLM expose a specific default port hint in the URL placeholder? No, make this port configurable

## Testing guidelines

- Create a new analysis config with each backend; verify the form fields adapt correctly.
- Use "Fetch Models" against a live local server for at least one backend (Ollama recommended for local dev).
- Run an analysis with a local config; verify the correct API format is used by checking api_call_logs.
- Edit an existing (pre-migration) ollama config; confirm it loads without errors and saves correctly.
- Verify the config list badge shows the correct backend label.
