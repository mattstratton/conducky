# Suggestions for Improving AI/Human Workflow Continuity

## Why This Happens
Each new chat session, the AI does not retain memory of previous conversations or the code it has written, unless provided a summary or context. This is due to privacy and security design: there is no persistent memory between sessions. The AI can only "see" what's in the current workspace, the files it can access, and what is provided in the current chat.

## How to Make This Better

### 1. Workspace Context
- The AI can always scan and search the codebase for context, but this takes a few steps at the start of each session. If you let the AI know which files or features are most relevant, it can focus attention there faster.

### 2. Persistent Summaries
- At the end of a session, the AI can generate a detailed summary of what was changed, why, and any open questions or TODOs. You can save this summary (e.g., in a `docs/ai-session-notes.md` file or similar).
- At the start of a new session, you can paste or reference this summary, and the AI will use it to get up to speed instantly.

### 3. Leverage Project Documentation
- Keeping `/reference/plan.md` and other docs up to date helps the AI understand the current state and priorities.
- If you have a "changelog" or "AI notes" file, the AI can read it at the start of each session.

### 4. Automated Context Loading
- If you want, the AI can always start by scanning recent git commits, test results, and key files to get context before asking anything.

### 5. Testing and Debugging
- The AI can run your test suite automatically at the start of a session to check for regressions, and then focus on any failing tests or recent changes.

## What the AI Will Do Differently
- Proactively run tests and scan for recent changes before asking for info.
- Keep questions to a minimum and focus on actionable debugging steps.
- Offer to generate or update session summaries for you to save and reuse.

## Customizable Workflow
- The AI can start every session by running all tests and summarizing failures.
- Always scan recent git diffs/commits for context.
- Generate a persistent summary at the end of each session for you to save.

Let the AI know your preference, and it will adapt its workflow to make things as seamless as possible for you. 