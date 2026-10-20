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

- Before editing for any implementation request, inspect the current branch, worktree status, diff, and branch history. Determine whether this is a continuation of the same task or a new task; do not infer task relevance merely because a feature branch is already checked out.
- Each new task needs a descriptive `codex/<task-name>` branch. Automatically create and switch to it if the current branch is unrelated, already merged, associated with a closed PR, the default branch, or a detached HEAD. The implementation request authorizes this step; do not ask for confirmation.
- Reuse an existing feature branch only when the conversation establishes that it is the same ongoing task and the branch is still active, or when the user explicitly requests that branch. Follow-up corrections and refinements to the same task stay together. For example, an exercise-creation redesign must not reuse a retry-screen branch simply because it is checked out.
- Before creating a branch, refresh the remote default branch and check whether the existing branch has merged; inspect PR status when needed to establish whether it is still active. Base the new branch on the current remote default branch, not on unrelated feature commits. If remote verification is unavailable, state that limitation rather than assuming the branch is active or the base is current.
- Preserve all existing staged, unstaged, and untracked changes when branching. Inspect which edits belong to the task, retain unrelated work safely, and verify preservation after switching. Never reset, discard, or automatically commit changes to make a branch switch succeed.
- Verify the branch switch succeeded with `git branch --show-current` before making implementation edits. If the switch fails, resolve the failure before editing; do not continue on the old branch.
- Follow an explicit user instruction to use a particular branch or stay on the current branch.
- For read-only questions or reviews, do not create or switch branches unless the user asks.
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

