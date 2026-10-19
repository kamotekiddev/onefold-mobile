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
- Backend workout templates are fetched as authenticated routines and cached per account for 24 hours; the production account seed no longer creates a default routine.
- New Routine is restored in the toolbar and empty state. Saving creates a backend template and immediately expires the list cache. The picker can create weighted/bodyweight exercises through the API, enabling first-routine creation on empty accounts.
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
