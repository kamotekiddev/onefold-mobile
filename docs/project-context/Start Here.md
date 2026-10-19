---
updated: 2026-10-19
tags: [onefold, context]
---
# Onefold project context

The repository root is the Obsidian vault. These notes in `docs/project-context/` preserve project context for future development sessions. They describe the **onefold-mobile repository**; backend behavior is only documented where evidenced by this client's code or README.

## Read first

1. Read the repository's [AGENTS.md](../../AGENTS.md) and the relevant [area instructions](../../docs/agent-instructions/).
2. Read [[Current State]] for the latest handoff, limitations, and verification.
3. Use [[Project Overview]], [[Architecture]], and [[Decisions]] for the area being changed.
4. Use [[Development Guide]] for setup and checks.

## Source of truth

These notes summarize inspected code and explicit instructions. Check the current source before editing: a dated note is context, not proof that behavior remains unchanged. Repository instructions govern how to work. Distinguish implemented behavior, recorded decisions, inferred rationale, and open questions.

## Keep context useful

After meaningful work, update the relevant topic and [[Current State]]. Record what changed, why, source paths or commit references, checks actually run, and any unfinished work. Add durable decisions to [[Decisions]]; mark superseded decisions rather than silently rewriting history.

Keep notes concise and linked. Do not copy full chat transcripts, secrets, tokens, real account data, or local environment values. Preserve personal notes and Obsidian settings. Only record a decision as user-approved when the conversation provides that evidence.

## Contents

- [[Project Overview]] — product capabilities and implementation boundary.
- [[Architecture]] — feature ownership, authentication, persistence, and domain rules.
- [[Decisions]] — established rules and observed implementation choices.
- [[Development Guide]] — setup, verification, and contribution workflow.
- [[Current State]] — latest snapshot and handoff.
