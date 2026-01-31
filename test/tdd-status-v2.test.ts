import { describe, expect, it, beforeEach } from "vitest";
import { CodexStatusManager } from "../lib/codex-status.js";
import { AccountManager } from "../lib/accounts.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getOpencodeConfigDir, getCachePath, getStoragePath } from "../lib/storage.js";

describe("TDD: Codex Status Tool Improvements", () => {
	const mockAccount = {
		accountId: "8144a34d-fd96-47b6-99ab-a4f769671726",
		email: "bfont39@live.com",
		plan: "Plus",
		addedAt: Date.now(),
		lastUsed: Date.now(),
		refreshToken: "rt1"
	};

	beforeEach(() => {
		const configDir = getOpencodeConfigDir();
		if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
		const cacheDir = join(configDir, "cache");
		if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
	});

	it("always renders both Primary and Weekly status lines even if data is missing", async () => {
		const manager = new CodexStatusManager();
		// No data seeded
		const lines = await manager.renderStatus(mockAccount as any);
		
		console.log("\n--- RENDERING: NO DATA ---");
		lines.forEach(l => console.log(l));
		
		expect(lines.length).toBeGreaterThanOrEqual(2);
		expect(lines[0]).toContain("Primary");
		expect(lines[0]).toContain("unknown");
		expect(lines[1]).toContain("Weekly");
		expect(lines[1]).toContain("unknown");
	});

	it("renders reset date for long-term limits (>24h)", async () => {
		const manager = new CodexStatusManager();
		const resetAt = Date.now() + (2 * 24 * 60 * 60 * 1000); // 48h from now
		const resetDate = new Date(resetAt);
		const expectedDateStr = `${resetDate.getMonth() + 1}/${resetDate.getDate()}`;

		await manager.updateFromHeaders(mockAccount as any, {
			"x-codex-secondary-used-percent": "15",
			"x-codex-secondary-window-minutes": "10080",
			"x-codex-secondary-reset-at": resetAt.toString()
		});

		const lines = await manager.renderStatus(mockAccount as any);
		console.log("\n--- RENDERING: LONG TERM RESET ---");
		lines.forEach(l => console.log(l));

		expect(lines.some(l => l.includes("7d") && l.includes(expectedDateStr))).toBe(true);
	});

	it("preserves previous limit data when only one limit is updated", async () => {
		const manager = new CodexStatusManager();
		
		// Initial update with both
		await manager.updateFromHeaders(mockAccount as any, {
			"x-codex-primary-used-percent": "10",
			"x-codex-primary-window-minutes": "300",
			"x-codex-secondary-used-percent": "20",
			"x-codex-secondary-window-minutes": "10080"
		});

		// Subsequent update with only Primary
		await manager.updateFromHeaders(mockAccount as any, {
			"x-codex-primary-used-percent": "50"
		});

		const snapshot = await manager.getSnapshot(mockAccount as any);
		expect(snapshot?.primary?.usedPercent).toBe(50);
		expect(snapshot?.secondary?.usedPercent).toBe(20); // Preserved
		
		const lines = await manager.renderStatus(mockAccount as any);
		console.log("\n--- RENDERING: PARTIAL UPDATE PRESERVATION ---");
		lines.forEach(l => console.log(l));
		expect(lines.some(l => l.includes("5h") && l.includes("50.0%"))).toBe(true);
		expect(lines.some(l => l.includes("7d") && l.includes("20.0%"))).toBe(true);
	});
});
