import { describe, it, expect, afterEach } from "vitest";

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
	configureStorageForCwd,
	getStoragePath,
	loadAccounts,
} from "../lib/storage.js";
import type { AccountStorageV3 } from "../lib/types.js";

const backupFixtureUrl = new URL(
	"./fixtures/backup/openai-codex-accounts.backup.json",
	import.meta.url,
);

function writeJson(filePath: string, value: unknown): void {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function seedStorage(storagePath: string, override?: Partial<AccountStorageV3>): void {
	const base = JSON.parse(readFileSync(backupFixtureUrl, "utf-8")) as AccountStorageV3;
	const seeded: AccountStorageV3 = {
		...base,
		...override,
		version: 3,
		accounts: override?.accounts ?? base.accounts,
		activeIndex: override?.activeIndex ?? 0,
	};
	writeJson(storagePath, seeded);
}

describe("per-project storage", () => {
	const originalCwd = process.cwd();
	const originalXdg = process.env.XDG_CONFIG_HOME;
	const originalHome = process.env.HOME;

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalXdg === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXdg;
		}
		if (originalHome === undefined) {
			delete process.env.HOME;
		} else {
			process.env.HOME = originalHome;
		}
		// Clear any configured override
		configureStorageForCwd({ cwd: originalCwd, perProjectAccounts: false });
	});

	it("falls back to global storage when no project accounts file exists", async () => {
		const root = mkdtempSync(join(tmpdir(), "opencode-perproj-"));
		const xdg = join(root, "xdg");
		process.env.XDG_CONFIG_HOME = xdg;
		mkdirSync(join(xdg, "opencode"), { recursive: true });

		const globalPath = getStoragePath();
		seedStorage(globalPath, { accounts: [] });

		const workdir = join(root, "project");
		mkdirSync(workdir, { recursive: true });
		process.chdir(workdir);

		const scope = configureStorageForCwd({ cwd: workdir, perProjectAccounts: true });
		expect(scope.scope).toBe("global");
		expect(scope.storagePath).toBe(globalPath);

		const loaded = await loadAccounts();
		expect(loaded?.accounts ?? []).toHaveLength(0);
	});

	it("uses repo-specific accounts file when present (no fallback to global)", async () => {
		const root = mkdtempSync(join(tmpdir(), "opencode-perproj-"));
		const xdg = join(root, "xdg");
		process.env.XDG_CONFIG_HOME = xdg;
		mkdirSync(join(xdg, "opencode"), { recursive: true });

		const globalPath = getStoragePath();
		// Seed global storage with non-empty accounts to prove we don't fall back.
		seedStorage(globalPath);

		const repoRoot = join(root, "repo");
		const projectDir = join(repoRoot, "packages", "a");
		mkdirSync(projectDir, { recursive: true });

		const projectAccountsPath = join(repoRoot, ".opencode", "openai-codex-accounts.json");
		seedStorage(projectAccountsPath, { accounts: [] });

		process.chdir(projectDir);
		const scope = configureStorageForCwd({ cwd: projectDir, perProjectAccounts: true });
		expect(scope.scope).toBe("project");
		expect(scope.storagePath).toBe(projectAccountsPath);

		const loaded = await loadAccounts();
		expect(loaded?.accounts ?? []).toHaveLength(0);
		// Ensure global storage still has accounts (to validate non-fallback)
		const globalLoaded = JSON.parse(readFileSync(globalPath, "utf-8")) as AccountStorageV3;
		expect(globalLoaded.accounts.length).toBeGreaterThan(0);
	});

	it("ignores repo-specific file when perProjectAccounts is disabled", async () => {
		const root = mkdtempSync(join(tmpdir(), "opencode-perproj-"));
		const xdg = join(root, "xdg");
		process.env.XDG_CONFIG_HOME = xdg;
		mkdirSync(join(xdg, "opencode"), { recursive: true });

		const globalPath = getStoragePath();
		seedStorage(globalPath, { accounts: [] });

		const repoRoot = join(root, "repo");
		const projectDir = join(repoRoot, "packages", "a");
		mkdirSync(projectDir, { recursive: true });
		const projectAccountsPath = join(repoRoot, ".opencode", "openai-codex-accounts.json");
		seedStorage(projectAccountsPath, { accounts: [] });

		process.chdir(projectDir);
		const scope = configureStorageForCwd({ cwd: projectDir, perProjectAccounts: false });
		expect(scope.scope).toBe("global");
		expect(scope.storagePath).toBe(globalPath);
	});

	it("does not migrate legacy accounts into project scope", async () => {
		const root = mkdtempSync(join(tmpdir(), "opencode-perproj-"));
		const xdg = join(root, "xdg");
		process.env.XDG_CONFIG_HOME = xdg;
		process.env.HOME = root;
		mkdirSync(join(xdg, "opencode"), { recursive: true });
		mkdirSync(join(root, ".opencode"), { recursive: true });

		const legacyPath = join(root, ".opencode", "openai-codex-accounts.json");
		seedStorage(legacyPath);

		const repoRoot = join(root, "repo");
		const projectDir = join(repoRoot, "packages", "a");
		mkdirSync(projectDir, { recursive: true });

		const projectAccountsPath = join(repoRoot, ".opencode", "openai-codex-accounts.json");
		seedStorage(projectAccountsPath, { accounts: [] });

		process.chdir(projectDir);
		configureStorageForCwd({ cwd: projectDir, perProjectAccounts: true });
		await loadAccounts();

		const projectStorage = JSON.parse(readFileSync(projectAccountsPath, "utf-8")) as AccountStorageV3;
		expect(projectStorage.accounts).toHaveLength(0);
		expect(existsSync(legacyPath)).toBe(true);
	});
});
