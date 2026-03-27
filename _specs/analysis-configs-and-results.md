# Spec for Analysis Configs and Results

branch claude/feature/analysis-configs-and-results

## Summary

Introduce named, reusable analysis configurations that can be created, edited, and deleted via a dedicated management page. Each configuration stores the provider settings (e.g. Claude API key, model, max tokens) needed to run an analysis. When an analysis is run from a configuration, the result is stored with a unique name derived from the configuration name and the date/time of the run. A new "Network Maps" navbar entry gives access to a map viewer that defaults to the latest result and lets the user switch between all stored results via a dropdown, or delete results individually.

## Functional requirements

- **Analysis Configurations page** (`/analysis/configs` or similar)
  - List all stored analysis configurations in a table/card layout, similar to the DC Nodes page
  - Each config has: a display name, provider (initially only "claude"), model, max tokens, optional base URL, API key
  - Support adding a new configuration via a form (inline or separate page)
  - Support editing an existing configuration
  - Support deleting a configuration (with confirmation)
  - One configuration can be marked as "active/default" to pre-select it on the Run Analysis UI

- **Run Analysis** (existing page, updated)
  - The run analysis trigger should reference a selected analysis configuration by name/ID rather than a single global config
  - The configuration selector should default to the active/default configuration

- **Analysis Results naming**
  - Each stored result must have a human-readable name composed of: `<config-display-name> – <YYYY-MM-DD HH:mm>` (local time at the time of the run)
  - This name is stored alongside the result in the database and displayed in the UI

- **Network Maps navbar entry**
  - Add a "Network Maps" link to the navbar, positioned to the left of the "NetMap" app logo/name
  - The link navigates to the network map viewer (`/` or a dedicated `/maps` route)

- **Network Map Viewer**
  - Defaults to the most recent analysis result on load
  - Shows a dropdown (top-left) listing all stored results by their human-readable name, sorted newest first
  - Selecting an entry from the dropdown switches the displayed map without a full page reload if possible
  - A "Delete" button (top-right) deletes the currently displayed result after confirmation
  - After deletion, the viewer falls back to the next most recent result, or shows an empty state if none remain
  - The node/edge count and result timestamp remain visible in the toolbar

## Possible edge cases

- Deleting the only remaining analysis result should show a clear empty state with a prompt to run a new analysis
- Deleting an analysis configuration that has associated results should either block deletion or orphan the results gracefully (results remain, config reference stored as plain text)
- Running an analysis with a configuration that has since been deleted or edited should not corrupt existing results
- Two analyses run in the same minute from the same configuration should still produce unique names (append seconds or a short ID suffix)
- API key field must remain masked in the config list and edit form, with an explicit "change key" toggle

## Acceptance criteria

- A user can create, edit, and delete analysis configurations from the management page
- Running an analysis stores the result with a name in the format `<config-name> – <date>`
- The Network Maps navbar link is visible and navigates to the map viewer
- The dropdown in the map viewer lists all stored results; selecting one updates the displayed map
- The delete button removes the current result and falls back to the next available result
- The existing API Call Logs card remains accessible on the analysis page

## Open questions

- Should the old global analysis settings (single Claude config stored in the `settings` table) be migrated to the new `analysis_configs` table automatically, or discarded? Yes, keep it.
- Should the "Network Maps" link replace the current home page (`/`) as the map viewer, or should `/maps` be a new dedicated route while `/` remains a redirect? replace
- Should there be a maximum number of stored results, or is retention unlimited? Create a limit of max 100 results

## Testing guidelines

- Verify that creating a config, running an analysis, and viewing the result all work end-to-end
- Confirm result names follow the `<config-name> – <YYYY-MM-DD HH:mm>` format
- Test the dropdown switch between at least three stored results
- Test deletion of the latest result and confirm fallback to the previous one
- Test deletion of the only result and confirm the empty state is shown
- Verify the API key is never exposed in plaintext in the config list or edit form
