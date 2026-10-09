# Dependencies

Use these rules before adding, removing, or upgrading packages.

## Expo First

- Prefer Expo modules over third-party packages when Expo provides the capability.
- Install packages with `npx expo install <package>` so versions match the installed Expo SDK.
- If the project has `bun.lock`, use `bunx` instead of `npx` for CLI commands, while still using Expo's install command pattern where applicable.
- Do not use `npm install`, `yarn add`, `pnpm add`, or `bun add` for Expo-managed native dependencies unless the user explicitly asks and the Expo docs support it.

## Documentation Check

- Read the major version of the `expo` package in `package.json`.
- Check matching versioned docs at `https://docs.expo.dev/versions/v<major>.0.0/`.
- For uncertain Expo, EAS, or React Native behavior, read `https://docs.expo.dev/llms.txt` and follow the relevant link.
- Do not rely on memory for Expo APIs, config plugins, EAS, or React Native behavior.

## Native Code

- If a package includes native code, note whether Expo Go can run it.
- After adding native code, expect the app to need a development build through `npx expo run:ios`, `npx expo run:android`, or `eas build --profile development`.
- Do not manually edit `ios/` or `android/` when they are absent. Configure native behavior through `app.json`, `app.config.*`, and config plugins.

## Package Hygiene

- Avoid adding dependencies for small utilities that are easy to implement locally.
- Check the existing codebase for an already installed package before adding a new one.
- Prefer packages that are maintained, typed, and compatible with the installed React Native and Expo SDK versions.
- Keep dependency changes scoped and explain why the package is needed.

