# Project Structure

Use a feature-based folder structure. Keep route files thin and put product logic near the feature it belongs to.

```text
src/
  app/                  # Expo Router routes only
  features/
    <feature-name>/
      components/       # Feature-specific UI
      hooks/            # Feature-specific hooks
      screens/          # Route-level screen components used by src/app
      services/         # API calls, storage, feature integrations
      utils/            # Feature-only helpers
      types.ts          # Feature-only types
      constants.ts      # Feature-only constants
      index.ts          # Public feature exports
  components/           # Shared, reusable UI across multiple features
    ui/                 # Low-level primitives
  hooks/                # Shared hooks used by multiple features
  constants/            # Shared app-wide constants and design tokens
  lib/                  # App-wide clients, adapters, and framework setup
  utils/                # App-wide pure helpers
  types/                # App-wide shared TypeScript types
```

Feature folders should be cohesive and boring: if code is used by only one feature, keep it inside that feature. Promote code to `src/components`, `src/hooks`, `src/lib`, `src/utils`, or `src/types` only after it is reused by multiple features or represents app-wide infrastructure.

## Feature Module Rules

- Name feature folders in kebab-case, for example `src/features/auth` or `src/features/profile-settings`.
- Export the feature's intended public surface from `src/features/<feature-name>/index.ts`.
- Import across features through the other feature's `index.ts`, not by reaching into its internals.
- Avoid circular feature dependencies. If two features need the same logic, move that logic to an app-wide shared folder.
- Keep feature services platform-aware and lightweight. Prefer Expo modules and React Native APIs that work on iOS, Android, and web when the app supports web.
- Co-locate tests with the code they cover when tests are added, for example `component.test.tsx` or `utils.test.ts`.
- Keep TypeScript strict and explicit at feature boundaries. Prefer named exports for feature modules and shared utilities.

## Screen And Route Pattern

- Files in `src/app/` define navigation and URL structure. They should compose screens from `src/features/*/screens`.
- Do not put business logic, API calls, complex state machines, or large UI trees directly in route files.
- A route file should usually look like: import a screen component, read route params if needed, and render the screen.
- Keep non-route code outside `src/app/`. Shared layout primitives belong in `src/components`; feature-specific layout belongs in the owning feature.

## React Native Performance

- Avoid unnecessary global state.
- Memoize expensive derived data.
- Use stable callbacks for long lists.
- Prefer `FlatList` and `SectionList` for large collections.
