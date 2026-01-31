import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TokenBucketTracker, selectHybridAccount, AccountWithMetrics } from "../lib/rotation.js";

// Load fixture accounts
const fixtureData = JSON.parse(
	readFileSync(join(import.meta.dirname, "fixtures/openai-codex-accounts.json"), "utf8")
);
const fixtureAccounts = fixtureData.accounts;

describe("hybrid rotation", () => {
	it("keeps current account when advantage is small", () => {
		const tokenTracker = new TokenBucketTracker({
			maxTokens: 10,
			initialTokens: 10,
			regenerationRatePerMinute: 0,
		});
		const now = Date.now();

		// Use fixture accounts with similar health scores
		const accounts: AccountWithMetrics[] = [
			{
				index: 0,
				accountId: fixtureAccounts[0].accountId,
				email: fixtureAccounts[0].email,
				plan: fixtureAccounts[0].plan,
				refreshToken: fixtureAccounts[0].refreshToken,
				lastUsed: now - 10_000,
				healthScore: 70,
				isRateLimited: false,
				isCoolingDown: false,
			},
			{
				index: 1,
				accountId: fixtureAccounts[1].accountId,
				email: fixtureAccounts[1].email,
				plan: fixtureAccounts[1].plan,
				refreshToken: fixtureAccounts[1].refreshToken,
				lastUsed: now - 10_000,
				healthScore: 80, // Only 10 points higher - not enough to overcome stickiness
				isRateLimited: false,
				isCoolingDown: false,
			},
		];

		const selected = selectHybridAccount(accounts, tokenTracker, 0, 50);
		expect(selected).toBe(0);
	});

	it("switches when another account is far better", () => {
		const tokenTracker = new TokenBucketTracker({
			maxTokens: 10,
			initialTokens: 10,
			regenerationRatePerMinute: 0,
		});
		const now = Date.now();

		// Use fixture accounts with large health score difference
		const accounts: AccountWithMetrics[] = [
			{
				index: 0,
				accountId: fixtureAccounts[0].accountId,
				email: fixtureAccounts[0].email,
				plan: fixtureAccounts[0].plan,
				refreshToken: fixtureAccounts[0].refreshToken,
				lastUsed: now - 10_000,
				healthScore: 40, // Below min usable but still valid for this test
				isRateLimited: false,
				isCoolingDown: false,
			},
			{
				index: 1,
				accountId: fixtureAccounts[1].accountId,
				email: fixtureAccounts[1].email,
				plan: fixtureAccounts[1].plan,
				refreshToken: fixtureAccounts[1].refreshToken,
				lastUsed: now - 10_000,
				healthScore: 95, // Far better - should trigger switch
				isRateLimited: false,
				isCoolingDown: false,
			},
		];

		const selected = selectHybridAccount(accounts, tokenTracker, 0, 50);
		expect(selected).toBe(1);
	});
});
