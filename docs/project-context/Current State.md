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

## Next-session handoff

Read [[Start Here]] and check current changes before starting new work. Update this note after meaningful work with changed areas, evidence, validation, and concrete unfinished items. Preserve older decisions with their status rather than treating every implementation detail as a permanent choice.
