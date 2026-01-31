This file provides coding guidance for AI agents working in this repository.

## Overview

This is an **opencode plugin** for OpenAI ChatGPT OAuth authentication. It intercepts OpenAI SDK
requests and transforms them for the ChatGPT Codex backend (`/backend-api/codex/responses`).

**Note on Ignored Files:**
The following files/directories are **gitignored on purpose** to keep agent context local:
- `AGENTS.md`: This instruction file.
- `docs/plans/`: Local planning documents.
- `BUG_FIXES.md`: Local bug tracking.
- `opencode.json`: Local project configuration.
- `.opencode/`: Agent/Environment specific workspace.
- `.codex-cache`: Local session caching.
- `test-third-account.mjs`: Local test account data.
Do not force-add these files to git.

Key account behaviors:
- Account identity is **accountId + email + plan**; selection skips records without full identity.
- Legacy records without identity are preserved and skipped for selection; `loadFromDisk()` attempts
  to hydrate them via refresh tokens and writes a backup before persisting updates.
- Storage is locked (`proper-lockfile`), merged on save, and written via atomic temp + rename.
- Refresh token duplicates are deduped and active indices are remapped after merges/dedupe.
- Proactive refresh queue can refresh tokens ahead of expiry (config flag).
- Accounts can be disabled via `enabled?: boolean` (selection and count skip disabled accounts).

## Conventions (post-fork hardening)

- Storage safety: any read/merge/write sequence (including migrations) must be performed under the same `proper-lockfile` lock used by `saveAccounts()`.
- Disabled accounts: never refresh/rotate/mutate tokens for `enabled: false` accounts (including background/proactive refresh).
- Quarantine safety: any quarantine/backup copy containing refresh tokens must attempt `0600` permissions (best-effort) and avoid unbounded buildup.
- UX copy: TUI toasts must stay short and actionable; avoid full filesystem paths in toasts (log full paths to CLI/debug output instead).
- Identity consistency: strict matching is `accountId + email + plan`; ensure identity fields are normalized consistently on write/read to avoid accidental duplication.

## Agent Workflow

- **Proactive Exploration:** Always invoke `Task(subagent_type="explore", prompt="...")` at the start of a new session or after a context compaction. Use the user's latest requests, active todos, and any compaction summaries to craft a prompt that gathers all necessary context for the current task.
- Do not ask for confirmation before responding to subagents; proceed immediately.

## Test Fixtures (source of truth)

Account examples MUST come from `test/fixtures/openai-codex-accounts.json`.

- Base fixture: `test/fixtures/openai-codex-accounts.json`
- Backups: `test/fixtures/backup/*.backup.json`
- OAuth callbacks: `test/fixtures/oauth-callbacks.json` (aligned to base accounts)
- Hydration data: `test/fixtures/oauth-hydration.json` (aligned to base accounts, includes access/id token payloads)

Rules:
- Do not invent account IDs/emails/tokens in tests.
- Tests that write storage must **seed the storage file** by copying the backup fixture into
  `openai-codex-accounts.json` before mutating it.

## Build & Test Commands

```bash
# Full build (TypeScript + assets)
npm run build

# Type checking only
npm run typecheck

# Run all tests
npm test

# Run a single test file (vitest)
npx vitest run test/auth.test.ts

# Run tests in watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Important: `npm run build` is required before deployment as it copies critical assets
(like `oauth-success.html`) to `dist/`.

## Release Workflow

**Primary Method:** Use the release shortcuts. These commands automate the entire pipeline: testing, versioning, building, pushing to GitHub, and triggering the OIDC-based npm publish.

**CRITICAL: NEVER run a release command without explicit permission from the user.**

```bash
# Choose the appropriate semantic version bump:
npm run release:patch  # 1.0.0 -> 1.0.1
npm run release:minor  # 1.0.0 -> 1.1.0
npm run release:major  # 1.0.0 -> 2.0.0
```

### What happens automatically:

1.  **Tests:** Runs `npm test` (aborts on failure).
2.  **Changelog:** *Manual Step* - You must update `CHANGELOG.md` **before** running the command.
3.  **Patch Notes:** *Manual Step* - You must draft detailed release notes in the GitHub release body following the "v4.5.9" format.
4.  **Version:** Bumps the version in `package.json` and creates a git commit.
5.  **Build:** Runs `npm run build` to update `dist/` artifacts.
6.  **Push:** Pushes code and tags to GitHub (`git push origin main --follow-tags`).
7.  **Publish (CI):** GitHub Actions detects the tag and automatically:
    *   Authenticates with npm via **OIDC**.
    *   Publishes the package to npm with **provenance**.
    *   Creates a **GitHub Release**.

### Patch Notes Format (Mandatory)

Every release must have a detailed description in the GitHub Release body matching this structure:

```markdown
### v[VERSION] — Release Notes (since [PREVIOUS_VERSION])

[High-level summary of the release goals.]

### Highlights

- [Key bullet point 1]
- [Key bullet point 2]

### User-Facing Changes

**[Feature Category 1]**

- [Specific change]
- [Specific change]

**[Feature Category 2]**

- [Specific change]

### Reliability & Data Safety

**[Technical Category 1]**

- [Details on hardening/fixes]

### Docs

- [Specific documentation updates]

**Full Changelog**: [link to comparison]
```


## File Locations

- Plugin Config: `~/.config/opencode/openai-codex-auth-config.json`
- Accounts File: `~/.config/opencode/openai-codex-accounts.json`
- Cache: `~/.config/opencode/cache/` (ETag-cached instructions and system prompts)
- Logs: `~/.config/opencode/logs/codex-plugin/` (if `ENABLE_PLUGIN_REQUEST_LOGGING=1`)
