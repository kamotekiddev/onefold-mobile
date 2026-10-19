---
updated: 2026-10-19
tags: [onefold, decisions]
---

# Decisions

Initial record assembled on 2026-10-19. Entries below distinguish repository policy from observed implementation. Original decision dates and motivations are not assumed.

## D001 — Feature-based modules and thin routes

**Status:** Established repository policy.

Use Expo Router for navigation. Put feature implementation under `src/features/<feature>/`, keep route files small, and use feature public exports for cross-feature access. Promote shared code only when it is reused or represents app-wide infrastructure.

**Reason stated by policy:** Clear ownership and less premature abstraction.

**Source:** [Project structure](../../docs/agent-instructions/project-structure.md), [coding standards](../../docs/agent-instructions/coding-standards.md), [routing](../../docs/agent-instructions/routing.md).

## D002 — Remote auth with account-local training data

**Status:** Implemented; recorded from source and commit `851c9c9`.

Use API authentication and native secure session storage, with training data separated by API environment and account. Keep historical demo data separate. Sign-out removes credentials but retains local training data.

**Consequence:** Account login does not provide cloud training sync or cross-device history. Account switches must not leak drafts or late request results.

**Rationale:** Original tradeoff discussion is not recorded; do not infer that local-only training is a permanent product commitment.

**Source:** [Auth provider](../../src/features/auth/auth-provider.tsx), [session manager](../../src/features/auth/services/session.ts), [account store](../../src/lib/storage/app-store.ts), [README](../../README.md#authentication-api).

## D003 — Complete sets and progress exercises sequentially

**Status:** Implemented; evidenced by commits `b5db2a3` and `316aad9`.

Require every set to be completed before finishing; keep the guided flow sequential, with a full-screen rest experience.

**Consequence:** Skipped and extra sets count as unfinished work. Progression calculations still consider only prescribed sets.

**Source:** [Workout services and tests](../../src/lib/domain/mock-services.test.ts), [exercise flow tests](../../src/features/workouts/utils/exercise-flow.test.ts).

## D004 — Snapshot prescriptions and version future targets

**Status:** Observed implementation.

Retain exercise/prescription snapshots in workouts; associate future targets with prescription revisions; confirm target reset when a prescription changes.

**Consequence:** Editing a routine does not rewrite history, and finishing an older workout cannot apply obsolete targets to a changed prescription.

**Source:** [Domain types](../../src/types/domain.ts), [services](../../src/lib/domain/mock-services.ts), [regression tests](../../src/lib/domain/mock-services.test.ts).

## D005 — Canonical kilograms with selectable display units

**Status:** Observed implementation.

Store canonical loads in kilograms and convert at input/display boundaries.

**Consequence:** A units preference change must not convert and overwrite canonical history or progression values.

**Source:** [Display helpers and tests](../../src/features/workouts/utils/display.test.ts), [preferences service](../../src/lib/domain/mock-services.ts).

## D006 — Version-aware Expo work and generated native projects

**Status:** Established repository policy.

Check the installed Expo major and matching docs before API changes. Use Expo's package installer for compatible dependencies. Configure native behavior through app configuration/plugins while native folders are generated.

**Source:** [AGENTS.md](../../AGENTS.md), [dependency rules](../../docs/agent-instructions/dependencies.md).

## D007 — Feature branches and standardized PR titles

**Status:** Established repository policy; commits `e3296f6` and `82accce`.

Before implementation, inspect the current branch; create a descriptive `codex/<task-name>` branch if on the default branch or detached HEAD. Continue an existing feature branch unless instructed otherwise. Preserve existing changes and commit only when asked.

PR titles start with a lowercase bracketed type, followed by an exact known issue identifier if available, then the description. Do not invent a ticket number or use the PR number as the ticket.

**Source:** [Git workflow](../../docs/agent-instructions/git-workflow.md).

## Adding a decision

Add a stable ID, date recorded, status, decision, rationale when known, practical consequences, and evidence. Label proposals as proposed. If a choice changes, mark the old entry superseded and link its replacement.

Related: [[Architecture]], [[Current State]].

## D008 — Dismissible offline retry notice

**Status:** Implemented; user-approved on 2026-10-19.

Show the `offline-local` retry action as a non-blocking floating notice above the bottom navigation. Users can dismiss it for the current offline episode; leaving the offline state makes it eligible to show again.

**Rationale:** Keep local training content available without permanently consuming layout space beneath the tab bar.

**Source:** [App layout](../../src/app/%28app%29/_layout.tsx).

## D009 — Backend templates are the routine source of truth

**Status:** Implemented on 2026-10-19.

Fetch authenticated workout templates from `GET /api/workout/Template` and `GET /api/workout/Template/{id}`. Normalize them into the existing local routine/workout model and cache the result per account for 24 hours. Production account hydration no longer creates the local default routine.

**Consequence:** Local workouts, history, progression, and preferences remain durable device-local data, while routine reads come from the backend or the last successful cache. The original blanket restriction on routine creation is superseded by D010 below. Editing, deletion, and duplication remain unavailable in the mobile integration.

**Temporary defaults:** Single target reps become both minimum and maximum reps; absent starting weight is omitted; weight increments in pounds are converted to kilograms; weight progression is selected when an increment exists, otherwise manual progression is used; missing exercise type defaults to weighted.

**Source:** [routine template loader](../../src/lib/domain/routine-templates.ts), [account store](../../src/lib/storage/app-store.ts), and adjacent backend `TemplateController`/template DTOs.

## D010 — Allow backend routine creation independently of other mutations

**Status:** Implemented on 2026-10-19 after the user reported the missing creation action. Supersedes D009's blanket restriction on creation.

Show New Routine on the list and Create routine in the empty state. Save with authenticated `POST /api/workout/Template`, retrieve the saved template's server IDs, and expire the collection cache immediately. A retry after a successful POST and failed detail fetch reuses the saved template ID within the account session.

The current API provides exercise creation and lookup by ID but no exercise listing. The picker therefore offers Add new exercise using `POST /api/workout/Exercise` and retains known server exercises locally, including unused exercises created while drafting. Fresh accounts and account resets use no seeded exercises or routines. The remote picker excludes legacy seed IDs.

**Contract limits:** Remote creation uses one target rep count, no starting load, and manual or weight progression. Template-level rest defaults to two minutes. The detail DTO still omits per-exercise rest, weight increments, and exercise type; reads keep their documented defaults, while locally known exercise types are retained. Editing, deletion, and duplication remain unavailable.

**Evidence:** The live OpenAPI document was read successfully outside the sandbox; response DTOs and validation were checked in the adjacent backend source. [Creation adapter](../../src/lib/domain/create-template.ts), [exercise adapter](../../src/lib/domain/create-exercise.ts), and [regression tests](../../src/lib/domain/remote-creation.test.ts).

## D012 — Share the app startup recovery layout

**Status:** Implemented locally on 2026-10-19 following the user's request to match the retry screen to the existing design system; visual review remains pending.

Use one app-level recovery component for training-data and session-loading errors, with existing theme tokens, shared text/card/error primitives, system symbols, and full-width rounded actions. Keep the original error visible and leave storage/retry behavior in its existing owner.

**Rationale:** Startup errors occur before feature navigation mounts; a shared safe-area-aware presentation makes these states consistent with the rest of the app without changing data recovery policy.

**Source:** [Recovery component](../../src/components/app-recovery-screen.tsx), [root layout](../../src/app/_layout.tsx).
