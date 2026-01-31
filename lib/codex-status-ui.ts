import { type ManagedAccount } from "./accounts.js";
import { type CodexRateLimitSnapshot } from "./codex-status.js";

function formatResetTime(resetAt: number): string {
	if (resetAt <= 0) return "";
	const resetDate = new Date(resetAt);
	const now = Date.now();
	const isMoreThan24h = resetAt - now > 24 * 60 * 60 * 1000;
	const timeStr = `${String(resetDate.getHours()).padStart(2, "0")}:${String(resetDate.getMinutes()).padStart(2, "0")}`;

	if (isMoreThan24h) {
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const dateStr = `${resetDate.getDate()} ${monthNames[resetDate.getMonth()]}`;
		return `(resets ${timeStr} on ${dateStr})`;
	} else {
		return `(resets ${timeStr})`;
	}
}

export function renderObsidianDashboard(
	accounts: ManagedAccount[],
	activeIndex: number,
	snapshots: CodexRateLimitSnapshot[],
): string[] {
	const now = Date.now();
	const lines: string[] = [];

	// Column Widths & Grid
	const W_NUM = 6;
	const W_STATUS = 14;
	const W_EMAIL = 42;
	const GAP = "   "; // Equal 3-space gap between all columns

	// Helper to find snapshot
	const findSnapshot = (acc: ManagedAccount) => {
		return snapshots.find(
			(s) =>
				s.accountId === acc.accountId &&
				s.email.toLowerCase() === acc.email?.toLowerCase() &&
				s.plan === acc.plan,
		);
	};

	// Header
	const hRow =
		`  #`.padEnd(W_NUM) +
		GAP +
		`  STATUS`.padEnd(W_STATUS) + 
		GAP +
		`ACCOUNT`.padEnd(W_EMAIL) +
		GAP +
		`PLAN`;
	lines.push(hRow);

	const divider =
		`  --`.padEnd(W_NUM) +
		GAP +
		`  --------`.padEnd(W_STATUS) + 
		GAP +
		"-".repeat(W_EMAIL).padEnd(W_EMAIL) +
		GAP +
		"-".repeat(50); // Extended underline for PLAN + Usage
	lines.push(divider);

	accounts.forEach((acc, i) => {
		const isActive = i === activeIndex;
		const isEnabled = acc.enabled !== false;
		const isAuthFailed =
			acc.coolingDownUntil !== undefined &&
			acc.coolingDownUntil > now &&
			acc.cooldownReason === "auth-failure";

		let statusLabel = "";
		if (!isEnabled) {
			statusLabel = "DISABLED";
		} else if (isAuthFailed) {
			statusLabel = "AUTH ERR";
		} else if (isActive) {
			statusLabel = "ACTIVE";
		} else {
			statusLabel = "ENABLED";
		}

		const num = `  ${i + 1}`.padEnd(W_NUM);
		const status = `  ${statusLabel}`.padEnd(W_STATUS);
		const email = (acc.email || "unknown").padEnd(W_EMAIL);
		const plan = acc.plan || "Free";

		// Main Row
		const mainRowContent =
			num + 
			GAP + 
			status + 
			GAP +
			email + 
			GAP +
			plan;
		lines.push(mainRowContent);

		// Snapshot Data
		const snapshot = findSnapshot(acc);
		// Indent to match ACCOUNT column (W_NUM + GAP.length + W_STATUS + GAP.length) = 26
		const indent = " ".repeat(W_NUM + GAP.length + W_STATUS + GAP.length); 

		const renderBar = (label: string, data: { usedPercent: number; resetAt: number } | null | undefined) => {
			const barWidth = 20;
			const usedPercent = data?.usedPercent ?? 0;
			const p = Math.max(0, 100 - usedPercent);
			const filled = Math.round((p / 100) * barWidth);
			const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
			const leftStr = `${String(p).padStart(3)}% left`;
			const resetStr = data?.resetAt ? formatResetTime(data.resetAt) : "";

			return `${label.padEnd(10)}[${bar}] ${leftStr}${resetStr ? ` ${resetStr}` : ""}`;
		};

		// Bar Rows
		lines.push(indent + renderBar("5h Limit", snapshot?.primary));
		lines.push(indent + renderBar("Weekly", snapshot?.secondary));

		// Credits Row
		const creditInfo = snapshot?.credits;
		const creditStr = creditInfo ? (creditInfo.unlimited ? "unlimited" : `${creditInfo.balance} credits`) : "0 credits";
		const creditRow = `${indent}${"Credits".padEnd(10)}${creditStr}`;
		lines.push(creditRow);

		if (i < accounts.length - 1) {
			lines.push("");
		}
	});

	return lines;
}
