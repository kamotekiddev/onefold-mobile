# State And Data

Use these rules for data fetching, local state, storage, and app services.

## State Ownership

- Keep state as local as possible.
- Use component state for purely local UI concerns.
- Use feature-level hooks for state shared within one feature.
- Use app-wide state only when multiple unrelated features need the same live data.
- Avoid global state for derived values that can be computed from existing state.

## Server Data

- Keep API calls and query/mutation options in feature `services`, with React hooks in feature `hooks`. Existing shared training adapters remain in `src/lib/domain`.
- Use the account-scoped TanStack Query client for remote routine state. The account key includes the API environment; never put tokens into query keys or query persistence.
- Query owns request sharing, freshness, bounded retries, foreground/reconnect refresh, and invalidation. Do not add another TTL or request-sharing cache inside remote services.
- Forward query AbortSignal through services and transport. Cancellation and session-refresh failures must not be retried by Query.
- Use creation mutation hooks with `networkMode: "always"`, `retry: false`, and an online check at execution. Reject offline submissions immediately; do not queue or replay POSTs.
- Persist normalized remote results before publishing query success. Hydrate from the SQLite snapshot with its original fetch timestamp; retain content and surface refresh/storage errors.
- Keep local workout data, history, preferences, and known-exercise filtering on reactive store reads. Remote exercise searches use account-scoped paginated Query state; persist discovered exercises before success without treating the local catalog as a complete search response. Query cache eviction must never remove durable workout inputs.
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
