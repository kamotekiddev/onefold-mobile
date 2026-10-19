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

- When the user asks to implement a plan, check the current branch before making implementation edits.
- If the checkout is on the repository's default branch, `main`, `master`, or a detached HEAD, create and switch to a descriptive `codex/<task-name>` branch automatically. The implementation request authorizes this step; do not ask for confirmation.
- If the user has already checked out a feature branch, continue on that branch unless they explicitly request another branch.
- Preserve all existing staged, unstaged, and untracked changes when branching. Never reset or discard changes to create a branch.
- Follow an explicit user instruction to use a particular branch or stay on the current branch.
- For other tasks, do not create or switch branches unless the user asks.
- For PR summaries, include what changed, how it was verified, and any known risks.
- Mention skipped checks and why they were skipped.

## PR Titles

- Always begin PR titles with a lowercase change type in square brackets: `[feature]`, `[fix]`, `[hotfix]`, `[refactor]`, `[docs]`, `[test]`, `[chore]`, `[perf]`, or `[ci]`.
- Choose the type that best describes the primary change. Use `[hotfix]` for urgent production fixes and `[fix]` for ordinary bug fixes.
- When an associated issue or ticket number is available in the task context, include its exact identifier immediately after the type prefix. Do not invent identifiers or use the PR's own number as the ticket number.
- Use the format `[type] ISSUE-ID Short description`, or `[type] Short description` when no issue or ticket is known.
- Examples: `[feature] #123 Add email authentication`, `[hotfix] APP-456 Fix session refresh failures`, and `[docs] Update agent workflow rules`.
- Apply these conventions when creating PRs or updating their titles, unless the user explicitly requests a different title format.

## Reviews

- For code review requests, prioritize bugs, regressions, missing tests, and maintainability risks.
- Lead with findings ordered by severity.
- Include file and line references when possible.

