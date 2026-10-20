This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project Memory (Obsidian)

The repository root is the Obsidian vault. Project context lives in `docs/project-context/`.

- At the start of a task, read [Start Here](docs/project-context/Start%20Here.md) and [Current State](docs/project-context/Current%20State.md), then the topic notes relevant to the work.
- Verify dated notes against current source and repository instructions before relying on them.
- After meaningful work, update the relevant notes and `Current State.md` with changes, verification results, and unfinished work. Record durable decisions, rationale when known, and evidence in `Decisions.md`.
- Distinguish implemented behavior, proposals, and open questions. Do not invent prior decisions or user approval; mark superseded decisions explicitly.
- Keep notes concise and linked. Never record credentials, tokens, real account data, or local environment values. Preserve personal notes and `.obsidian/` settings.

## Additional Instructions

Read the relevant instruction files before editing that area:

- Project structure and feature folder rules: `docs/agent-instructions/project-structure.md`
- Coding standards and shared code rules: `docs/agent-instructions/coding-standards.md`
- UI, mobile design, accessibility, and list performance: `docs/agent-instructions/ui-and-design.md`
- Testing approach and verification: `docs/agent-instructions/testing.md`
- Dependency, Expo package, and native module policy: `docs/agent-instructions/dependencies.md`
- Expo Router conventions: `docs/agent-instructions/routing.md`
- State, data fetching, storage, and side effects: `docs/agent-instructions/state-and-data.md`
- Environment variables, runtime config, and secrets: `docs/agent-instructions/env-and-secrets.md`
- Git workflow and worktree safety: `docs/agent-instructions/git-workflow.md`

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- Before editing for any implementation task, verify that the current branch belongs to that task and has not already been merged or closed. An existing feature branch is not permission to reuse it for unrelated work. For a new task, automatically create and switch to a descriptive `codex/<task-name>` branch from the current remote default branch, preserving all existing changes. Reuse a branch only for the same ongoing task or when the user explicitly requests it. Verify the branch switch succeeded before editing. See `docs/agent-instructions/git-workflow.md` for details.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
