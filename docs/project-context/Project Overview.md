---
updated: 2026-10-19
tags: [onefold, product]
---
# Project Overview

Onefold is a mobile-first strength-training app for creating routines, following workouts, logging sets, and progressing future targets.

## Implemented capabilities

| Area | Current behavior |
| --- | --- |
| Authentication | Email registration, sign-in, saved sessions, refresh, and local sign-out through the Onefold authentication integration on iOS/Android. |
| Routines | Create, edit, duplicate, delete, reorder exercises, and assign weekly days. |
| Exercises | Search/filter a seeded catalog of 24 exercises by name, muscle group, and equipment. |
| Workouts | Start or resume one active workout, follow exercises and sets in sequence, log reps/weight, add sets, and use rest timers. |
| Progression | Manual, weight, or reps modes; completed sessions generate future targets. |
| History | Completed workout records retain exercise and prescription snapshots. |
| Settings | Kilogram/pound display preference, account sign-out, and confirmed reset of the current account's local training data. |

New accounts receive a “Full body foundations” routine, an exercise catalog, kilogram units, and no workout history.

## Product boundary

Authentication is remote; training data is device-local and separated by API base URL and account ID. Signing in does **not** sync routines or history across devices. The training service implementation is still named `mock-services.ts`, but it is the runtime implementation used with durable native storage.

Web is configured as a build target, but the current auth provider presents an unsupported screen there. Do not describe the full signed-in experience as available on web.

Google sign-in, Apple sign-in, and password reset are disabled/coming-soon controls. Their presence in routes or UI does not mean they work.

## Visual direction

The existing UI uses a restrained teal palette, system fonts, rounded controls, and light/dark themes. Reuse tokens from [theme.ts](../../src/constants/theme.ts) and primitives from [shared UI](../../src/components/ui/index.tsx).

The [design reference](../../.superdesign/design-system.md) contains useful visual guidance, but its descriptions of demo authentication predate the API integration. Current source wins for product behavior.

## Evidence

[Domain types](../../src/types/domain.ts), [seed data](../../src/lib/domain/seed.ts), [training services](../../src/lib/domain/mock-services.ts), [auth provider](../../src/features/auth/auth-provider.tsx), and [README authentication section](../../README.md#authentication-api).

Related: [[Architecture]], [[Decisions]], [[Current State]].
