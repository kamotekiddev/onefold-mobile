# Environment And Secrets

Use these rules for environment variables, runtime config, and secrets.

## Expo Environment Variables

- Treat variables exposed to the client as public.
- Do not put secrets in client-visible Expo config or public environment variables.
- Use clear prefixes and names that communicate whether a value is public.
- Keep environment access centralized where practical, for example in `src/lib/env`.

## Runtime Config

- Configure app identity, native behavior, plugins, and public constants through `app.json` or `app.config.*`.
- Prefer config plugins for native settings when using Continuous Native Generation.
- Do not manually edit generated `ios/` or `android/` folders when they are absent.

## Secrets

- Never commit API secrets, signing credentials, private keys, tokens, or production passwords.
- Use EAS secrets or the deployment platform's secret storage for build-time and runtime secrets.
- Redact secrets from logs, screenshots, issues, and agent responses.
- Rotate credentials if a secret is accidentally exposed.

## Files

- Keep `.env` files out of git unless they are explicitly safe examples.
- Use `.env.example` for documented placeholders.
- Do not add real secrets to test fixtures or sample data.

