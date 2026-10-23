# Conducky: Agent Instructions

This file is for non-Claude-Code agents (Codex, Copilot, Gemini CLI, Cursor, etc.). **`CLAUDE.md` is the single source of truth** for stack, commands, rules and conventions. Everything in it applies here.

- Slash-command skills (`/pr`, `/implement-issue`, ...) in `.claude/skills/` are Claude Code features. Other agents: follow the same steps manually (tests, type-check, docs update, branch + PR, never push `main`).
- Use `GLOSSARY.md` vocabulary.
