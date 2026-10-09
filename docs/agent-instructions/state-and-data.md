# State And Data

Use these rules for data fetching, local state, storage, and app services.

## State Ownership

- Keep state as local as possible.
- Use component state for purely local UI concerns.
- Use feature-level hooks for state shared within one feature.
- Use app-wide state only when multiple unrelated features need the same live data.
- Avoid global state for derived values that can be computed from existing state.

## Server Data

- Keep API calls in feature `services` when they belong to one feature.
- Put app-wide API clients and adapters in `src/lib`.
- Validate or normalize external data at the boundary before it reaches UI code.
- Model loading, empty, success, and error states explicitly.
- Avoid swallowing errors. Return useful error shapes or throw intentionally.

## Local Storage

- Keep storage keys centralized in the owning feature or `src/lib` for app-wide storage.
- Version persisted data when shape changes are likely.
- Do not store secrets in plain client-side storage.
- Account for storage read/write failures.

## Offline And Network Behavior

- Prefer resilient UI that can show cached or partial data when appropriate.
- Keep retry behavior deliberate and bounded.
- Make destructive actions explicit and recoverable where possible.

## Side Effects

- Keep side effects out of render paths.
- Put reusable side-effect logic in hooks or services.
- Clean up subscriptions, timers, and listeners.
- Avoid race conditions by cancelling stale requests or ignoring stale responses when components unmount or params change.

