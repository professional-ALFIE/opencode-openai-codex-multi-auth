import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountStorageV3 } from "../lib/types.js";
import { AUTH_LABELS, JWT_CLAIM_PATH } from "../lib/constants.js";
import { createJwt } from "./helpers/jwt.js";

const mockLoadAccounts = vi.fn();
let capturedStorage: AccountStorageV3 | null = null;

vi.mock("@opencode-ai/plugin", () => {
	const createSchema = () => {
		const schema = {
			describe: () => schema,
			optional: () => schema,
		};
		return schema;
	};

	const tool = (definition: unknown) => definition;
	(tool as { schema?: unknown }).schema = {
		number: createSchema,
		boolean: createSchema,
		string: createSchema,
		array: createSchema,
	};

	return { tool };
});

vi.mock("../lib/storage.js", async () => {
	const actual = await vi.importActual<typeof import("../lib/storage.js")>(
		"../lib/storage.js",
	);
	return {
		...actual,
		loadAccounts: () => mockLoadAccounts(),
		saveAccounts: async (storage: AccountStorageV3) => {
			capturedStorage = storage;
		},
	};
});

const fixture = JSON.parse(
	readFileSync(
		new URL("./fixtures/openai-codex-accounts.json", import.meta.url),
		"utf-8",
	),
) as AccountStorageV3;

function createPluginInput() {
	return {
		client: {
			tui: { showToast: vi.fn() },
			auth: { set: vi.fn() },
		},
		project: {},
		directory: "/tmp",
		worktree: "/tmp",
		$: {},
	} as any;
}

async function loadPlugin() {
	const module = await import("../index.js");
	return module.OpenAIAuthPlugin;
}

describe("auth login workflow", () => {
	beforeEach(() => {
		mockLoadAccounts.mockReset();
		capturedStorage = null;
	});

	it("falls back to access token claims when id token is missing identity", async () => {
		const originalNoBrowser = process.env.OPENCODE_NO_BROWSER;
		process.env.OPENCODE_NO_BROWSER = "1";
		mockLoadAccounts.mockResolvedValueOnce({
			...fixture,
			accounts: [],
		});

		const account = fixture.accounts[0]!;
		const accountEmail = account.email ?? "user.one@example.com";
		const accountPlan = account.plan ?? "Plus";
		const accessToken = createJwt({
			[JWT_CLAIM_PATH]: {
				chatgpt_account_id: account.accountId,
				chatgpt_user_email: accountEmail,
				chatgpt_plan_type: accountPlan.toLowerCase(),
			},
		});
		const idToken = createJwt({ sub: "oidc-only" });

		const authModule = await import("../lib/auth/auth.js");
		vi.spyOn(authModule, "createAuthorizationFlow").mockResolvedValue({
			pkce: { verifier: "verifier", challenge: "challenge" },
			state: "state123",
			url: "https://example.com",
		});
		vi.spyOn(authModule, "exchangeAuthorizationCode").mockResolvedValue({
			type: "success",
			access: accessToken,
			refresh: "refresh-token",
			expires: Date.now() + 60_000,
			idToken,
		});

		const OpenAIAuthPlugin = await loadPlugin();
		const plugin = await OpenAIAuthPlugin(createPluginInput());
		const oauthMethod = plugin.auth?.methods.find((method) => method.label === AUTH_LABELS.OAUTH);
		const flow = await (oauthMethod as any).authorize();
		await (flow as any).callback("code#state123");

		const savedAccount = capturedStorage?.accounts[0];
		expect(savedAccount?.accountId).toBe(account.accountId);
		expect(savedAccount?.email).toBe(accountEmail.toLowerCase());
		expect(savedAccount?.plan).toBe(accountPlan);

		process.env.OPENCODE_NO_BROWSER = originalNoBrowser;
	});
});
