# Git Workflow

Use these rules when working in the repository.

## Worktree Safety

- Check the current diff before making broad changes.
- Do not revert or overwrite user changes unless the user explicitly asks.
- Keep edits scoped to the requested task.
- Avoid unrelated formatting churn.
- If unrelated files are dirty, leave them alone.

## Commits

- Do not create commits unless the user asks.
- When asked to commit, use focused commits with clear messages.
- Prefer conventional, readable messages such as `feat: add profile screen` or `fix: handle empty search results`.

## Branches And PRs

- Do not create or switch branches unless the user asks.
- For PR summaries, include what changed, how it was verified, and any known risks.
- Mention skipped checks and why they were skipped.

## Reviews

- For code review requests, prioritize bugs, regressions, missing tests, and maintainability risks.
- Lead with findings ordered by severity.
- Include file and line references when possible.

