---
updated: 2026-10-20
tags: [onefold, handoff]
---

# Data fetching modernization handoff

## Request and status

The user requested implementation on 2026-10-20. The three delivery phases below have now been implemented on `codex/data-fetching-modernization`; the research checkpoint and baseline constraints remain historical context. See [[Decisions#D014 — Query owns remote fetching; SQLite retains offline workout inputs]] and [[Current State#Data fetching modernization — 2026-10-20]] for the resulting behavior and verification. Native device acceptance remains pending. The user subsequently requested commit/push/PR delivery through the commit-push-pr skill; unrelated Obsidian settings remain excluded.

Read [[Start Here]], [[Current State]], [[Architecture]], and relevant `docs/agent-instructions/` files first. Revalidate source and repository status before editing.

## Research repository checkpoint (before implementation)

- Created `codex/data-fetching-modernization` from freshly fetched `origin/main` at `4b19e8a` for this handoff and future task work. Verified the switch.
- PR #18 (exercise picker empty-state creation) and PR #17 (Obsidian files) are merged into that base.
- Preserved unrelated modified `.obsidian/app.json` and `.obsidian/workspace.json`; do not overwrite or include them in task commits.
- This handoff and its Current State link are uncommitted. No commit, push, PR, new agent, or new session was requested or created.
- Before implementing, check branch relevance, status, history, and the current remote base again. Keep same-task work together; never reuse an unrelated feature branch.
- Stack inspected: Expo 57, React Native 0.86.3, React 19.2.3, npm/package-lock. Check current versions before using APIs.

## Recommended ownership

Use TanStack Query v5 for remote server state, retaining the existing authenticated fetch transport and SQLite local storage.

| Concern                                                                       | Proposed owner                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Remote routine lists/details                                                  | Feature query hooks                               |
| Remote routine/exercise creation                                              | Feature mutation hooks                            |
| Offline routine snapshots and workout inputs                                  | SQLite, coordinated with successful query results |
| Local exercise catalog/filtering, workouts, history, progression, preferences | Existing store and reactive selectors             |
| Search, filters, selection, form drafts                                       | Local component/feature state                     |
| Tokens, refresh, authentication lifecycle                                     | Existing session manager                          |

## Baseline evidence and constraints (before implementation)

- `src/lib/api-client.ts`: JSON transport, typed errors, 15-second timeout, caller AbortSignal support. Caller cancellation currently becomes a timeout-kind error; distinguish cancellation so it does not trigger retries or error UI. Some HTTP messages are auth-specific despite shared use.
- `src/features/auth/services/session.ts`: shared refresh promise, one refresh/retry after 401, account generation checks, offline-local behavior. Preserve these; query retries must not duplicate auth handling.
- `src/features/auth/auth-provider.tsx`: existing AppState and expo-network listeners; account identity includes API environment. Coordinate query lifecycle listeners with this behavior and clean them up.
- `src/app/_layout.tsx` and `src/lib/app-provider.tsx`: account-keyed provider/store lifecycle. Place stable query-client ownership within the account boundary; cancel and clear outgoing in-memory queries on account changes. Preserve account-specific local storage policy.
- `src/lib/domain/routine-templates.ts`: 24-hour TTL, shared fetchTask, one list request followed by parallel detail requests for every routine. Any load error returns old routines when cached, masking refresh failures. getById also loads the aggregate list. Do not simply wrap this unchanged in useQuery: the inner TTL would defeat query invalidation.
- `src/lib/domain/create-template.ts`: records a successful POST's template ID in an in-memory map before loading its detail. Retry after a detail failure reuses that ID. Preserve partial-success handling; it is not durable idempotency across restarts.
- `src/lib/domain/create-exercise.ts`: writes local catalog after remote creation. Consider remote-success/local-write-failure behavior when migrating mutations.
- `src/lib/domain/mock-services.ts`: used by production with authenticated requests despite its name; defaults to an artificial 180ms delay. Exercise search is local; no exercise-list endpoint was available in the inspected contract. Workouts/history/progression remain local. Remote routine update/delete/duplicate remain unsupported.
- `src/lib/services.ts`: public service methods need cancellation plumbing despite transport support.
- `src/lib/storage/app-store.ts`: account-scoped SQLite snapshots, serialized writes, schema 2/3 compatibility, disposed-store protection. Workout creation consumes persisted routines/exercises. An evictable query cache must not replace durable workout data.
- Screens repeat loading/error/data state, alive guards, and focus/effect loaders. Local reads and remote requests need different migration paths.

## Delivery plan (implemented; device acceptance pending)

### PR 1 — Query infrastructure

- Add the minimal query dependency using the repository's dependency policy.
- Shared setup belongs in `src/lib`; feature services, query keys, and hooks belong in their owning features. Keep route files thin.
- Create a stable account-scoped QueryClient. Isolate keys by resource/parameters and account/environment as appropriate; never include tokens.
- Integrate foreground and connectivity using AppState and existing expo-network, including initial network state and listener cleanup.
- Forward AbortSignal through services to fetch. Distinguish cancellation, timeout, HTTP, network, and invalid-response errors.
- Proposed initial policy: routine staleTime 5 minutes; stale foreground/reconnect/manual refresh; at most two retries for transient read failures with backoff; no retries for validation/auth failures after session handling. These values are proposals to tune.
- Creation must not silently queue offline or automatically retry/replay POSTs. `retry: false` alone is not enough to define offline behavior; handle network mode and offline submission explicitly.

### PR 2 — Routine queries and offline snapshots

- Introduce useRoutines/useRoutine hooks and migrate list/detail/editor consumers.
- Remove service-owned TTL/deduplication as the consumers migrate. Query owns freshness and request state; SQLite owns the durable offline snapshot.
- Hydrate query data from validated snapshots with original fetch timestamps. Coordinate persistence before publishing successful results; handle storage failures explicitly.
- Preserve cached content during refresh and refresh failures. Distinguish first loading, successful empty results, cached-plus-error, and offline-without-data states.
- Guard against stale responses overwriting newer mutations or another account.
- Inspect list DTO capabilities before choosing summary/lazy-detail queries. Initially bound detail-request concurrency if fanout remains necessary; backend batching/full-list support is a separate contract change.
- Defer a generic persisted query cache unless a requirement justifies it; do not introduce a second independent persistence/freshness system.

### PR 3 — Mutations and local read cleanup

- Introduce useCreateRoutine/useCreateExercise; persist results, update relevant query entries, and invalidate affected lists.
- Preserve saved-but-not-loaded recovery and prevent older reads from replacing newly created records. Do not add unsupported backend mutations.
- Replace unnecessary async local loaders with reactive store selectors for exercise filtering/history where appropriate.
- Remove artificial production delays and obsolete cache helpers; keep demo/failure-injection behavior isolated.
- Update data-fetching conventions, Architecture, Current State, and Decisions once behavior is implemented. Do not record this proposal as an established decision prematurely.

## Verification and acceptance

Add focused tests for shared requests, cancellation without retry, bounded read retries, preserved cached data after refresh failure, original timestamps after hydration, account-switch isolation, creation/read races, partial-success duplicate prevention, and remote-success/storage-failure handling.

Verify offline restart can still display saved routines and run workouts. Verify foreground/reconnect refresh, no misleading empty state on failures, and no unexpected offline write replay on iOS/Android.

Run `npx expo lint`, `npx tsc --noEmit`, `npm test`, and dependency checks when adding packages. Use matching Expo 57 docs before touching Expo/RN APIs. Update memory with actual results and remaining gaps.

The planning turn ran no implementation checks. During handoff preparation, `npx expo lint`, `npx tsc --noEmit`, and `git diff --check` passed. No tests were added or run for this documentation-only change; the 46-test suite passed earlier UI delivery. These are not migration validation. Device visual QA from that work remained pending because computer-use Accessibility permission was unavailable. The user previously requested no further Superdesign usage.

## Primary documentation consulted

- [TanStack Query React Native integration](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [Network mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- [Mutation invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
- [Expo 57 documentation](https://docs.expo.dev/versions/v57.0.0/)

## Suggested next-session prompt

Read AGENTS.md, docs/project-context/Start Here.md, Current State.md, and Data Fetching Handoff.md. Implement the proposed data-fetching modernization in the documented order. Recheck the branch and preserve unrelated Obsidian edits. Retain offline workouts, account isolation, and partial-success creation recovery. Run the required checks and update project memory. Do not commit or push unless I ask.
