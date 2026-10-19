---
updated: 2026-10-19
tags: [onefold, development]
---
# Development Guide

## Start a session

Read [[Start Here]] and [[Current State]], then the relevant repository instructions. Inspect the current branch, worktree status, and diff before edits. Re-check source paths and versions rather than assuming this snapshot remains current.

## Local setup

The snapshot has `package-lock.json` and no `bun.lock`; use npm/npx. See [package scripts](../../package.json).

- Install locked dependencies with `npm ci` when needed.
- Copy `.env.example` to `.env.local` only if the local file does not already exist. Set the public `EXPO_PUBLIC_API_URL` locally and restart Expo after changes.
- Run `npm start`, `npm run ios`, or `npm run android`.
- `npm run web` exists, but current auth and account storage do not support the signed-in web experience.

The [README](../../README.md#authentication-api) describes an adjacent `onefold-services` backend and its development OpenAPI endpoint at `/openapi/v1.json`. Backend availability was not verified here. Documented host examples are `http://localhost:5158` for an iOS simulator and `http://10.0.2.2:5158` for an Android emulator. Physical devices need a reachable endpoint; the README recommends trusted HTTPS.

Do not run `npm run reset-project` as ordinary setup: it is a starter-reset script, not the application's account data reset.

## Verification

Required by repository instructions:

```sh
npx expo lint
npx tsc --noEmit
```

For behavior changes, run relevant tests, or `npm test` for the suite. [scripts/test.mjs](../../scripts/test.mjs) discovers colocated `.test.ts`/`.test.tsx` files under `src` and runs Node's test runner through `tsx`.

Existing tests cover auth sessions and races, API errors, auth validation, routine reordering, training services/progression, exercise flow, and unit/timer display helpers. Unit tests do not establish simulator or device behavior.

Run `npx expo-doctor` when dependencies/native configuration change. Record actual results and any limitations in [[Current State]].

## Expo and native changes

Read the actual `expo` version first. The current declared major is 57; repository instructions require checking [matching Expo docs](https://docs.expo.dev/versions/v57.0.0/) before API edits. Use the [Expo docs index](https://docs.expo.dev/llms.txt) for other Expo topics and follow the relevant page.

Use `npx expo install <package>` for compatible dependencies. If the repository later gains `bun.lock`, follow its instructions to use `bunx`. Native modules may require a new development build. This snapshot has no `ios/`, `android/`, or `eas.json`; do not assume a named EAS build profile exists just because the app is linked to an EAS project.

## Finish a session

Update the relevant vault topic, add any durable decision, and refresh [[Current State]] with changes, verification, and concrete remaining work. Preserve existing user notes and `.obsidian` configuration. Keep local environment values and credentials out of the vault.

Related: [[Decisions]], [[Architecture]].
