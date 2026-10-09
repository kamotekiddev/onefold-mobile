# Routing

Use these rules for Expo Router navigation and route files.

## Route Ownership

- `src/app/` owns URL structure and navigator setup.
- Route files should stay thin. Compose screens from `src/features/*/screens`.
- `_layout.tsx` files define navigators, shared route options, and route groups.
- Keep business logic, API calls, complex state, and large UI trees outside `src/app/`.

## Navigation APIs

- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Use declarative `Link` for visible navigation elements when practical.
- Use `router` for imperative navigation after events such as submit, login, or dismiss.
- Keep route param parsing explicit and close to the route or screen boundary.

## Route Groups And Organization

- Use route groups to organize navigation without changing URLs.
- Keep auth, onboarding, tabs, modals, and protected areas in clear route groups when the app grows.
- Mirror feature ownership through screens in `src/features`, not by nesting feature implementation inside `src/app`.

## Params And Data

- Treat route params as untrusted strings.
- Validate, parse, or normalize params before using them in feature logic.
- Avoid passing large objects through route params. Pass identifiers and let the feature load the data it needs.

## Auth And Guards

- Put auth gates and redirects in layouts or small route-level wrappers.
- Keep auth state management in an auth feature or app-wide auth provider.
- Avoid duplicating guard logic across many screens.

## Modals And Presentation

- Use Expo Router modal patterns for modal screens.
- Keep modal content inside feature screens or components.
- Ensure modal routes work with deep links and back behavior where relevant.

