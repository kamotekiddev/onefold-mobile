---
updated: 2026-10-19
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
- Existing runtime service names still include “mock” and “demo”; these do not imply that native authentication is mocked.
- Obsidian vault settings in `.obsidian/` are now tracked with the repository.

See [[Project Overview]], [[Architecture]], and [[Decisions]].

## Known limits and follow-up candidates

These are observed gaps or questions, not an approved backlog:

- Training data has no implemented cloud sync in this client.
- Web auth/account storage is unsupported.
- Google/Apple sign-in and password reset are disabled placeholders.
- The root README still includes starter-template guidance; use its authentication section plus current source for project-specific behavior.
- The design reference still describes demo authentication and needs reconciliation if that document is used for future UI work.
- No EAS build configuration file was present; confirm actual profiles before scheduling a build.
- Backend deployment, runtime API availability, native device flows, and release readiness were not verified in this documentation task.

## Recent history worth knowing

| Commit | Recorded change |
| --- | --- |
| `82accce` | PR title prefixes and ticket reference conventions. |
| `e3296f6` | Feature-branch requirement before implementation. |
| `851c9c9` | Auth API integration and account-scoped local storage. |
| `316aad9` | Sequential workout exercise order. |
| `b5db2a3` | Require completed sets and show full-screen rest. |
| `18ce490` | Workout completion screen redesign. |
| `dd1d8a4` | Guided active workouts one set at a time. |
| `791f742` | Weekly routine scheduling and today's workout. |

## Verification on 2026-10-19

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: passed, 37 tests.
- `git diff --check`: passed.
- Wiki links and local source links: validated across all six context notes.
- Unit suite and device flows: not run for this documentation-only task.
- No application code, dependency, or native configuration changes were needed.
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
