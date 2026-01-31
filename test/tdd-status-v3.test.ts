import { describe, expect, it, beforeEach } from "vitest";
import { CodexStatusManager } from "../lib/codex-status.js";
import { AccountManager } from "../lib/accounts.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getOpencodeConfigDir, getCachePath, getStoragePath } from "../lib/storage.js";

describe("TDD: Tool Logic and Hydration", () => {
	const realAccountsPath = getStoragePath();

	beforeEach(() => {
		const configDir = getOpencodeConfigDir();
		if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
	});

	it("renders real account data with both primary and weekly limits", async () => {
		const manager = new CodexStatusManager();
		const accountManager = await AccountManager.loadFromDisk();
		const accounts = accountManager.getAccountsSnapshot();
		
		// Seed some test data for the first real account
		if (accounts.length > 0) {
			const acc = accounts[0];
			await manager.updateFromHeaders(acc as any, {
				"x-codex-primary-used-percent": "33",
				"x-codex-primary-window-minutes": "300",
				"x-codex-secondary-used-percent": "66",
				"x-codex-secondary-window-minutes": "10080"
			});

			console.log(`\n--- RENDERING FOR REAL ACCOUNT: ${acc.email} ---`);
			const lines = await manager.renderStatus(acc as any);
			lines.forEach(l => console.log(l));

			expect(lines.some(l => l.includes("5h") && l.includes("33.0%"))).toBe(true);
			expect(lines.some(l => l.includes("7d") && l.includes("66.0%"))).toBe(true);
		}
	});

	it("shows 'unknown' for accounts with no data, ensuring alignment", async () => {
		const manager = new CodexStatusManager();
		const accountManager = await AccountManager.loadFromDisk();
		const accounts = accountManager.getAccountsSnapshot();
		
		if (accounts.length > 0) {
			const acc = accounts[0];
			// Ensure cache is empty for this test
			const cachePath = getCachePath("codex-snapshots.json");
			if (existsSync(cachePath)) writeFileSync(cachePath, "[]");

			console.log(`\n--- RENDERING FOR UNKNOWN DATA: ${acc.email} ---`);
			const lines = await manager.renderStatus(acc as any);
			lines.forEach(l => console.log(l));

			expect(lines[0]).toContain("Primary");
			expect(lines[0]).toContain("unknown");
			expect(lines[1]).toContain("Weekly");
			expect(lines[1]).toContain("unknown");
		}
	});
});
