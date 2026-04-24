# Spec for local-ollama-llm-analysis

branch claude/feature/local-ollama-llm-analysis

## Summary
Add "Ollama (Local)" as a third LLM provider for analysis configs. Users configure the hostname or IP of their Ollama server, fetch the list of installed models dynamically, and run analyses — all without sending data to external cloud APIs.

## Functional requirements
- A new provider option "Ollama (Local)" appears in the analysis config provider dropdown
- When Ollama is selected, the Base URL field is required (e.g. `http://192.168.1.100:11434`)
- Instead of a static model list, a "Fetch Models" button queries the Ollama server's `/api/tags` endpoint and populates a dropdown with the returned model names
- If the Base URL is changed after fetching models, the model list resets to empty
- API key is optional for Ollama configs (empty string is valid)
- When an API key is present, it is sent as an `Authorization: Bearer` header; otherwise no auth header is sent
- Analysis execution routes to the Ollama `/api/chat` endpoint using the stored base URL, model, and optional API key
- System prompt is passed as a `{ role: "system" }` message; user message as `{ role: "user" }`
- `max_tokens` is passed via `options.num_predict`
- All existing result storage, 100-result cap, API call logging, and layout persistence apply identically to Ollama-generated results

## Possible edge cases
- Ollama server is unreachable when the user clicks "Fetch Models" — show inline error
- Ollama server returns an empty model list (no models installed) — show a helpful message
- User changes base URL after fetching models — stale model list is cleared
- Model name contains a colon (e.g. `llama3.2:latest`) — stored and sent as-is
- Ollama server requires a Bearer token — API key field covers this case
- User submits the config form without clicking "Fetch Models" — form validation requires a model to be selected

## Acceptance criteria
- Creating an Ollama config with a valid base URL and a fetched model saves successfully
- Clicking "Fetch Models" with an invalid or unreachable URL shows an inline error, no crash
- Running an analysis with an Ollama config produces a stored result with the same graph structure as Claude/Google results
- An API call log entry is created for each Ollama analysis run
- Ollama configs appear in the config list and can be set as default, edited, and deleted

## Open questions
- None

## Testing guidelines
- Start a local Ollama instance or mock the `/api/tags` and `/api/chat` endpoints
- Create an Ollama config, fetch models, save, run analysis
- Verify the result appears in the map viewer with correct graph data
- Test the "Fetch Models" error path with a bad or unreachable URL
- Confirm existing Claude and Google configs are unaffected
