import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { PluginConfig } from "../lib/types.js";
import * as config from "../lib/config.js";
import * as storage from "../lib/storage.js";
import {
	configureStorageForPluginConfig,
	configureStorageForCurrentCwd,
} from "../lib/storage-scope.js";

describe("storage-scope wiring", () => {
	const trackedEnvVars = ["CODEX_AUTH_PER_PROJECT_ACCOUNTS"] as const;
	let originalEnv: Record<string, string | undefined>;

	beforeEach(() => {
		originalEnv = Object.fromEntries(
			trackedEnvVars.map((name) => [name, process.env[name]]),
		) as Record<string, string | undefined>;
		vi.restoreAllMocks();
		storage.configureStorageForCwd({ cwd: process.cwd(), perProjectAccounts: false });
	});

	afterEach(() => {
		for (const name of trackedEnvVars) {
			const value = originalEnv[name];
			if (value === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = value;
			}
		}
		storage.configureStorageForCwd({ cwd: process.cwd(), perProjectAccounts: false });
	});

	it("uses config value when env var is unset", () => {
		delete process.env.CODEX_AUTH_PER_PROJECT_ACCOUNTS;
		const pluginConfig: PluginConfig = { perProjectAccounts: true };
		const cwd = "/tmp/project";

		const configureSpy = vi
			.spyOn(storage, "configureStorageForCwd")
			.mockReturnValue({ scope: "project", storagePath: "/tmp/project/.opencode/openai-codex-accounts.json" });

		const result = configureStorageForPluginConfig(pluginConfig, cwd);

		expect(configureSpy).toHaveBeenCalledWith({ cwd, perProjectAccounts: true });
		expect(result.scope).toBe("project");
	});

	it("prioritizes env var over config", () => {
		process.env.CODEX_AUTH_PER_PROJECT_ACCOUNTS = "0";
		const pluginConfig: PluginConfig = { perProjectAccounts: true };
		const cwd = "/tmp/project";

		const configureSpy = vi
			.spyOn(storage, "configureStorageForCwd")
			.mockReturnValue({ scope: "global", storagePath: "/tmp/global" });

		const result = configureStorageForPluginConfig(pluginConfig, cwd);

		expect(configureSpy).toHaveBeenCalledWith({ cwd, perProjectAccounts: false });
		expect(result.scope).toBe("global");
	});

	it("configures scope using loadPluginConfig and cwd", () => {
		delete process.env.CODEX_AUTH_PER_PROJECT_ACCOUNTS;
		const loadSpy = vi
			.spyOn(config, "loadPluginConfig")
			.mockReturnValue({ perProjectAccounts: true });
		const configureSpy = vi
			.spyOn(storage, "configureStorageForCwd")
			.mockReturnValue({ scope: "project", storagePath: "/tmp/project/.opencode/openai-codex-accounts.json" });

		const result = configureStorageForCurrentCwd();

		expect(loadSpy).toHaveBeenCalled();
		expect(configureSpy).toHaveBeenCalledWith({
			cwd: process.cwd(),
			perProjectAccounts: true,
		});
		expect(result.scope).toBe("project");
	});
});
