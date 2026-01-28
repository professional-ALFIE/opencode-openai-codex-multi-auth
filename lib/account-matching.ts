import type { AccountRecordV3 } from "./types.js";

export function findAccountMatchIndex(
	accounts: AccountRecordV3[],
	candidate: { accountId?: string; plan?: string; email?: string },
): number {
	const accountId = candidate.accountId?.trim();
	if (!accountId) return -1;
	const plan = candidate.plan?.trim();
	const email = candidate.email?.trim();

	if (plan && email) {
		const strictMatch = accounts.findIndex(
			(account) =>
				account.accountId === accountId &&
				account.plan === plan &&
				account.email === email,
		);
		if (strictMatch >= 0) return strictMatch;
		const planMatches = accounts
			.map((account, index) => ({ account, index }))
			.filter(
				({ account }) => account.accountId === accountId && account.plan === plan,
			);
		if (planMatches.length === 1 && !planMatches[0]?.account.email) {
			return planMatches[0]?.index ?? -1;
		}
		return -1;
	}

	if (plan) {
		const matches = accounts
			.map((account, index) => ({ account, index }))
			.filter(
				({ account }) => account.accountId === accountId && account.plan === plan,
			);
		if (matches.length === 1) return matches[0]?.index ?? -1;
		return -1;
	}

	if (email) {
		const matches = accounts
			.map((account, index) => ({ account, index }))
			.filter(
				({ account }) => account.accountId === accountId && account.email === email,
			);
		if (matches.length === 1) return matches[0]?.index ?? -1;
		return -1;
	}

	const matches = accounts
		.map((account, index) => ({ account, index }))
		.filter(({ account }) => account.accountId === accountId);
	if (matches.length === 1) return matches[0]?.index ?? -1;
	return -1;
}
