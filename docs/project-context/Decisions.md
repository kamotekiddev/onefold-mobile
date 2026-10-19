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
