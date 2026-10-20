---
updated: 2026-10-20
tags: [onefold, handoff]
---

# Current State

## Snapshot

Inspected on 2026-10-19 (Asia/Manila), at commit `82accce` on `codex/pr-title-conventions`. Re-check the current branch and status before continuing; this is historical context, not a branch instruction.

The user requested an Obsidian project memory so future assistant sessions can recover project details and decisions. The repository root is the Obsidian vault; context notes live in `docs/project-context/`. `AGENTS.md` directs future sessions to read and maintain them. This initial set of notes was assembled from repository instructions, source, tests, and recent commit subjects. It does not infer unrecorded product commitments.

## Working implementation

- Expo SDK 57 application with feature-based TypeScript modules.
- Native API authentication with secure session persistence and account-scoped local training data.
- Offline-local auth state now shows a dismissible floating retry notice above the bottom navigation; dismissal lasts for the current offline episode and retry behavior is unchanged.
- Routine scheduling, exercise selection/reordering, guided workouts, full-screen rest, completion summaries, history, and unit preferences.
- Backend workout templates are fetched as authenticated routines and cached per account for 24 hours; the production account seed no longer creates a default routine.
- Routine creation is available through the toolbar or the empty state's Create routine action; the toolbar action is hidden while the empty state is shown. Saving creates a backend template and immediately expires the list cache. The picker can create weighted/bodyweight exercises through the API, enabling first-routine creation on empty accounts.
- Existing runtime service names still include “mock” and “demo”; these do not imply that native authentication is mocked.
- Obsidian vault settings in `.obsidian/` are now tracked with the repository.

See [[Project Overview]], [[Architecture]], and [[Decisions]].

## Known limits and follow-up candidates

These are observed gaps or questions, not an approved backlog:

- Workout history and progression have no implemented cloud sync in this client.
- Web auth/account storage is unsupported.
- Google/Apple sign-in and password reset are disabled placeholders.
- The root README still includes starter-template guidance; use its authentication section plus current source for project-specific behavior.
- The design reference still describes demo authentication and needs reconciliation if that document is used for future UI work.
- No EAS build configuration file was present; confirm actual profiles before scheduling a build.
- Backend deployment, runtime API availability, native device flows, and release readiness were not verified in this documentation task.
- The live OpenAPI document was read successfully outside the sandbox during the creation fix. The earlier sandbox-only connection failure did not establish that the API was unavailable. Response DTOs and validation were checked against adjacent backend source.
- There is no exercise-list endpoint; the picker offers known exercises and Add new exercise. Remote routine editing, deletion, and duplication remain unavailable. Template detail responses omit per-exercise rest, weight increments, and exercise type; see [[Decisions#D010 — Allow backend routine creation independently of other mutations]].

## Recent history worth knowing

| Commit    | Recorded change                                        |
| --------- | ------------------------------------------------------ |
| `82accce` | PR title prefixes and ticket reference conventions.    |
| `e3296f6` | Feature-branch requirement before implementation.      |
| `851c9c9` | Auth API integration and account-scoped local storage. |
| `316aad9` | Sequential workout exercise order.                     |
| `b5db2a3` | Require completed sets and show full-screen rest.      |
| `18ce490` | Workout completion screen redesign.                    |
| `dd1d8a4` | Guided active workouts one set at a time.              |
| `791f742` | Weekly routine scheduling and today's workout.         |

## Verification on 2026-10-19

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: passed, 46 tests after the routine-creation fix.
- Creation regression tests cover empty-account creation, authenticated request bodies, immediate cache expiry, failed writes, retry after partial success, and retained exercise types/catalog entries.
- `git diff --check`: passed.
- Wiki links and local source links: validated across all six context notes.
- Simulator/device flows and authenticated writes against the running backend: not exercised in this fix. No dependencies or native configuration changes.
- `.obsidian/` settings were committed in `d5ed074` and pushed on `codex/commit-obsidian-settings`; PR #12 is open against `main`.

## Next-session handoff

Read [[Start Here]] and check current changes before starting new work. Update this note after meaningful work with changed areas, evidence, validation, and concrete unfinished items. Preserve older decisions with their status rather than treating every implementation detail as a permanent choice.

## Temporary storage debugging — 2026-10-19

- On `codex/debug-storage-load-errors`, based on refreshed `origin/main` at `4aed419`, removed the promise rejection suppression from initial training-store hydration and the storage error screen's Retry loading action at the user's request. See [[Architecture#Temporary storage debugging]]. Existing unrelated changes were preserved.
- The reported screen matches `parseStored` rejecting the local account snapshot. Which validation condition fails is still unknown; backend seeding has not been established as the cause.
- `npx expo lint`, `npx tsc --noEmit`, and `git diff --check`: passed. No tests added for this temporary two-call-site change; simulator overlay behavior remains unverified.
- Next: reload or retry in development to capture the rejection stack; inspect the invalid format, fix the underlying compatibility issue, and restore deliberate rejection handling after debugging. No local data was reset or migrated.

## Retry screen design — 2026-10-19

- On `codex/retry-screen-design`, created from refreshed `origin/main` at `4aed419` with all existing work preserved, updated startup recovery screens to match the existing design system. See [[Architecture#Startup recovery presentation]].
- Added `src/components/app-recovery-screen.tsx`; the root layout now uses it for training-data and session-loading errors. Presentation includes a compact brand heading, centered bordered card, accent-soft warning symbol, original error details, and full-width retry/secondary actions with 48-point minimum touch targets. Top safe-area spacing also applies to initial loading.
- Retry/session behavior is preserved, including the user's earlier temporary removal of training-load promise catches. The iOS simulator now confirms the unhandled error overlay references `parseStored`. No saved data was reset or migrated.
- `npx expo lint`, `npx tsc --noEmit`, and `git diff --check`: passed. No new tests for this presentation-only change. Full visual QA remains unfinished: the simulator screenshot was obscured by the debugging overlay; dismissing it through computer use required missing Accessibility permission. Review the recovery layout after dismissing the overlay, including dark mode and large text.
- The user requested no further Superdesign usage; implementation uses the local components and tokens directly. Continue without external design generation.
- Delivery verification: `npx expo lint`, `npx tsc --noEmit`, and `npm test` passed (37 tests). The PR includes the recovery presentation and the previously requested temporary debugging change; unrelated branch-policy and Obsidian workspace edits are excluded.

## Storage version mismatch diagnosis — 2026-10-19

- Continuing the same storage-recovery work on `codex/retry-screen-design` / PR #15. A read-only structural check confirmed the simulator snapshot uses schema 3; required arrays and unit preference pass validation. The branch's older schema-2-only reader caused the reported exception, rather than exercise seeding.
- PR #14 has merged into `main` at `7465038`. Merging that code into the open retry-screen branch restores its schema-2/3 reader and backend-routine integration while retaining the redesigned recovery screen and requested debugging behavior. The only merge conflict was in decision notes; both sets of decisions were retained.
- No reset, database mutation, or schema downgrade was performed during diagnosis. No snapshot contents or account identifiers were copied to project notes.

## Add new exercise design — 2026-10-20

- Continuing on the existing `codex/retry-screen-design` feature branch, redesigned `src/features/exercises/components/create-exercise-form.tsx` with the local design system. The entry row expands into a bordered Card with a labeled name field, explicit Weighted/Bodyweight radio choices, error treatment, and wrapping cancel/create actions. See [[Architecture#Exercise creation presentation]] and [[Decisions#D013 — Align inline exercise creation with the routine builder]].
- Preserved creation requests and picker selection. Inputs and actions lock while saving, with visible loading feedback. No dependencies, routes, or native configuration changes; unrelated Obsidian changes were preserved.
- `npx expo lint`, `npx tsc --noEmit`, `npm test` (46 tests), and `git diff --check`: passed. No new tests for this presentation change.
- Visual QA remains unfinished: the iOS simulator is running, but Orca Computer Use reports missing macOS Accessibility permission. Review the collapsed/expanded form, dark mode, large text, and keyboard layout on-device; authenticated writes were not exercised.

### Pop-up follow-up — 2026-10-20

- At the user's request, replaced the inline expansion with a centered React Native Modal over a dimmed backdrop, retaining the form styling and creation flow. The pop-up includes safe-area spacing, keyboard avoidance, scrolling for compact screens/large text, and guarded Cancel/Android Back/accessibility escape dismissal. Successful creation closes it automatically.
- `npx expo lint`, `npx tsc --noEmit`, and `git diff --check`: passed. The 46-test suite passed before this presentation follow-up; no service logic changed. On-device visual review remains pending due to the previously observed Accessibility permission limit.

## Routine creation action — 2026-10-20

- At the user's request, `RoutineListScreen` now hides toolbar New Routine when the loaded empty state shows Create routine. Populated, loading, and error states retain toolbar access. See [[Decisions#D010 — Allow backend routine creation independently of other mutations]].
- `npx expo lint`, `npx tsc --noEmit`, and `git diff --check`: passed. No new tests for this conditional presentation change; device visual review remains pending.

## Branch correction and workflow rules — 2026-10-20

- Moved the uncommitted exercise/routine UI work onto `codex/exercise-creation-ui`, created from `origin/main` at `6b8f2c6` (the merged retry-screen PR). All existing tracked/untracked edits were preserved; no commits were created. Earlier entries describing work on the retry-screen branch are historical.
- At the user's explicit request, updated `AGENTS.md` and the linked Git workflow to require task relevance, active branch/PR status, a refreshed remote default base for new tasks, and verification of a successful switch before editing. This supersedes automatic reuse of any existing feature branch. Same-task follow-ups stay together; explicit user branch choices take precedence. See [[Decisions#D007 — Feature branches and standardized PR titles]].
- Delivery verification: `npx expo lint`, `npx tsc --noEmit`, and `npm test` (46 tests) passed again with the final UI and rule changes. Simulator visual review remains pending; unrelated `.obsidian/` settings/plugins and `.obsidianignore` are excluded from delivery.
