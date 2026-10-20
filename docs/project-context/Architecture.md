---
updated: 2026-10-20
tags: [onefold, architecture]
---

# Architecture

## Stack and ownership

As declared in [package.json](../../package.json): Expo `~57.0.27`, React `19.2.3`, React Native `0.86.3`, Expo Router `~57.0.25`, and TypeScript `~6.0.3`. Re-read the manifest before API work.

| Location                                       | Responsibility                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/`                                     | Router screens, route groups, layouts, and access gates.                   |
| `src/features/auth/`                           | Auth UI, validation, provider, and session manager.                        |
| `src/features/routines/`                       | Routine list, editor, configuration, draft state, and reordering.          |
| `src/features/exercises/`                      | Exercise picker.                                                           |
| `src/features/workouts/`                       | Start, active, detail screens, set controls, rest UI, and workout helpers. |
| `src/features/history/`                        | History screen.                                                            |
| `src/features/settings/`                       | Units, account, local reset, and development failure simulation.           |
| `src/lib/`                                     | Shared API client, app provider, storage, and training domain services.    |
| `src/types/domain.ts`                          | Shared training model and storage snapshot types.                          |
| `src/components/ui/`, `src/constants/theme.ts` | Shared UI and theme tokens.                                                |

Routes use `(auth)` and `(app)` groups. The app tabs are Routines, History, and Settings; routine editing and workout screens live outside the tab group. See [root layout](../../src/app/_layout.tsx) and [tabs layout](../../src/app/%28app%29/%28tabs%29/_layout.tsx).

The root mounts `AuthProvider`. An account boundary mounts `AppProvider` keyed by account identity; navigation waits for training storage hydration. `useApp()` exposes the store snapshot and services. State subscriptions use `useSyncExternalStore`.

## Authentication and API

[API client](../../src/lib/api-client.ts) centralizes the public `EXPO_PUBLIC_API_URL`, JSON requests, a 15-second timeout, and normalized network, timeout, HTTP, and invalid-response errors.

[Session manager](../../src/features/auth/services/session.ts) calls:

| Endpoint                 | Request            | Expected success    |
| ------------------------ | ------------------ | ------------------- |
| `POST /api/Auth/sign-up` | Email and password | 201 with token pair |
| `POST /api/Auth/sign-in` | Email and password | 200 with token pair |
| `POST /api/Auth/refresh` | Refresh token      | 200 with token pair |

The client validates token shape and reads identity/expiry claims; decoding claims is not server-side signature verification. Native sessions are saved in SecureStore with a version and API environment. Credentials must be persisted before sign-in is reported as successful.

Refreshes are shared across concurrent requests. Protected requests retry once after a 401, and account-generation checks reject stale responses after account changes. Transient refresh failures can retain an `offline-local` session for local training access. Foreground/network events trigger bounded automatic retries.

Sign-out removes local credentials; it is not remote token revocation. The README reports no server logout endpoint. Backend implementation and deployment were not inspected for this snapshot.

## Account-local persistence

[Native account store](../../src/lib/storage/app-store.ts) opens `onefold-accounts.db` and stores JSON in `account_state(account_key, value)`. The key combines normalized API base URL and account ID. The current `AppData` schema version is 3.

Routines and their exercise catalog are fetched from the authenticated workout-template API and stored as a derived account-local cache with a 24-hour TTL. The first production hydration does not create a default routine from the local seed. Expired cache refreshes replace the cached routines atomically; a failed refresh keeps the last successful cache available for offline workout use. Template fields that are not present in the current API are normalized with documented mobile defaults.

Routine creation uses authenticated `POST /api/workout/Template`, loads the saved definition with server IDs, and expires the list cache immediately. The exercise picker offers `POST /api/workout/Exercise` because the API has no exercise-list endpoint. Cache refresh retains known server exercises and their known tracking types; fresh accounts and resets have no seeded catalog. Editing, deletion, and duplication of remote routines remain blocked. See [[Decisions#D010 — Allow backend routine creation independently of other mutations]].

Writes are serialized; the store clones data and persists before publishing the updated snapshot. Unsupported stored shapes surface an error instead of being overwritten. Account disposal blocks old stores from publishing; provider cleanup clears workout drafts.

The old `onefold-demo.db` is preserved separately, with no automatic import into real accounts. Signing out retains account training data. The Settings reset action replaces only the active account's training data with seed data and leaves the user signed in.

The [web storage adapter](../../src/lib/storage/app-store.web.ts) is intentionally unavailable and excludes native SQLite from that bundle.

## Training rules to preserve

- Only one workout can be active per account. Reusing a start request ID returns the same workout.
- Workout entries snapshot the exercise and prescription; editing/deleting a routine must not rewrite historical workouts.
- Every set, including extras and legacy skipped sets, must be completed before finishing.
- The guided UI keeps exercises sequential and resumes unfinished work. Rest timers store an end timestamp rather than relying solely on decrementing a counter.
- Progression uses prescribed sets, not extras. Weight progression requires all prescribed sets to meet maximum reps and planned load; it adds the weight increment and resets reps to the minimum.
- Rep progression requires meeting current reps/load, increments toward the cap, and never exceeds it. Manual progression retains the current target.
- Prescription changes require target-reset confirmation and increment the prescription revision. Old workout suggestions cannot overwrite targets for a newer revision.
- Saved weights use canonical kilograms; pounds are a display/input conversion.

Evidence: [services](../../src/lib/domain/mock-services.ts), [progression](../../src/lib/domain/progression.ts), [exercise flow](../../src/features/workouts/utils/exercise-flow.ts), and [display helpers](../../src/features/workouts/utils/display.ts).

Related: [[Decisions]], [[Development Guide]].

## Temporary storage debugging

On 2026-10-19, the user requested temporarily removing the catch that hides training-storage load rejections from debugging tools. [AppProvider](../../src/lib/app-provider.tsx) and the [root layout's storage retry](../../src/app/_layout.tsx) now invoke `hydrate()` without catching its rejected promise. The store still publishes its error state and rethrows the original error; snapshot validation and data preservation remain in place. An iOS simulator screenshot confirmed the unhandled rejection overlay points to `parseStored`.

Read-only inspection later established a version mismatch: the saved snapshot uses schema 3 from the backend-routines work, while the earlier retry-screen branch accepted only schema 2. The required collection types and weight-unit validation passed. Syncing the merged backend-routines code from `origin/main` at `7465038` restores the existing schema-2/3 reader and avoids resetting or downgrading saved data. The temporary rejection suppression removal remains in place pending the end of debugging.

## Startup recovery presentation

[AppRecoveryScreen](../../src/components/app-recovery-screen.tsx) supplies a shared app-level recovery layout for training-store errors, session-storage errors, and unavailable authentication. It uses the existing palette, typography, Card, ErrorMessage, system symbols, and rounded 48-point Pressable controls. A compact Onefold heading sits above a centered, width-limited card; error details remain visible. The layout scrolls and includes all safe-area edges. The [root layout](../../src/app/_layout.tsx) still owns retry and session-clearing behavior; this presentation change adds no reset or migration. Light/dark rendering and large-text behavior still need visual verification; the diagnostic overlay obscured the simulator and GUI control lacked Accessibility permission.

## Exercise creation presentation

The picker's [CreateExerciseForm](../../src/features/exercises/components/create-exercise-form.tsx) opens a centered React Native Modal from the outlined Add new exercise row. The pop-up uses a dimmed backdrop and shared Card with a labeled name input, descriptive Weighted/Bodyweight radio choices, inline errors, and rounded cancel/create actions. It is width-limited, safe-area-aware, scrollable, and keyboard-avoiding. Cancel, Android Back, and accessibility escape dismiss it unless saving; success closes it automatically. Presentation uses the existing palette, spacing, typography, and radii; controls have 48-point minimum touch targets and wrap rather than fixed heights. Saving locks inputs/actions and shows progress; the existing creation service and automatic picker selection remain unchanged. No dependencies or routes were added. Simulator visual review, including dark mode, keyboard, and large text, remains pending because GUI control lacks macOS Accessibility permission.
