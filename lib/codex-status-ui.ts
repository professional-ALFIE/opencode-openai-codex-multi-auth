import { type ManagedAccount } from "./accounts.js";
import { type CodexRateLimitSnapshot } from "./codex-status.js";

// Box-drawing characters
const BOX = {
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
	horizontal: "─",
	vertical: "│",
	midLeft: "├",
	midRight: "┤",
	midTop: "┬",
	midBottom: "┴",
	cross: "┼",
};

// Column widths (content width, excluding borders)
const W = {
	num: 4,        // " 1 " or "10 "
	status: 12,    // "● DISABLED  "
	account: 63,   // Email row OR progress bar row
	plan: 10,      // "Plus" or "Pro" with padding
};

function hLine(left: string, mid: string, right: string): string {
	return (
		left +
		BOX.horizontal.repeat(W.num) +
		mid +
		BOX.horizontal.repeat(W.status) +
		mid +
		BOX.horizontal.repeat(W.account) +
		mid +
		BOX.horizontal.repeat(W.plan) +
		right
	);
}

function row(num: string, status: string, account: string, plan: string): string {
	return (
		BOX.vertical +
		num.padEnd(W.num) +
		BOX.vertical +
		status.padEnd(W.status) +
		BOX.vertical +
		account.padEnd(W.account) +
		BOX.vertical +
		plan.padEnd(W.plan) +
		BOX.vertical
	);
}

function formatResetTime(resetAt: number): string {
	if (resetAt <= 0) return "";
	const resetDate = new Date(resetAt);
	const now = Date.now();
	const isMoreThan24h = resetAt - now > 24 * 60 * 60 * 1000;
	const timeStr = `${String(resetDate.getHours()).padStart(2, "0")}:${String(resetDate.getMinutes()).padStart(2, "0")}`;

	if (isMoreThan24h) {
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const dateStr = `${resetDate.getDate()} ${monthNames[resetDate.getMonth()]}`;
		return `(${timeStr} ${dateStr})`;
	} else {
		return `(${timeStr})`;
	}
}

export function renderObsidianDashboard(
	accounts: ManagedAccount[],
	activeIndex: number,
	snapshots: CodexRateLimitSnapshot[],
): string[] {
	const now = Date.now();
	const lines: string[] = [];

	// Helper to find snapshot
	const findSnapshot = (acc: ManagedAccount) => {
		return snapshots.find(
			(s) =>
				s.accountId === acc.accountId &&
				s.email.toLowerCase() === acc.email?.toLowerCase() &&
				s.plan === acc.plan,
		);
	};

	// Top border
	lines.push(hLine(BOX.topLeft, BOX.midTop, BOX.topRight));

	// Header row
	lines.push(row(" #", " STATUS", " ACCOUNT", " PLAN"));

	// Header separator
	lines.push(hLine(BOX.midLeft, BOX.cross, BOX.midRight));

	accounts.forEach((acc, i) => {
		const isActive = i === activeIndex;
		const isEnabled = acc.enabled !== false;
		const isAuthFailed =
			acc.coolingDownUntil !== undefined &&
			acc.coolingDownUntil > now &&
			acc.cooldownReason === "auth-failure";

		// Status with indicator
		let statusLabel: string;
		let statusIndicator: string;
		if (!isEnabled) {
			statusIndicator = "○";
			statusLabel = "DISABLED";
		} else if (isAuthFailed) {
			statusIndicator = "✕";
			statusLabel = "AUTH ERR";
		} else if (isActive) {
			statusIndicator = "●";
			statusLabel = "ACTIVE";
		} else {
			statusIndicator = "○";
			statusLabel = "READY";
		}

		const statusStr = ` ${statusIndicator} ${statusLabel}`;
		const emailStr = ` ${acc.email || "unknown"}`;
		const planStr = ` ${acc.plan || "Free"}`;

		// Main row with email
		lines.push(row(` ${i + 1}`, statusStr, emailStr, planStr));

		// Snapshot data rows
		const snapshot = findSnapshot(acc);

		const renderBar = (label: string, data: { usedPercent: number; resetAt: number } | null | undefined): string => {
			const barWidth = 20;
			const usedPercent = data?.usedPercent ?? 0;
			const p = Math.max(0, 100 - usedPercent);
			const filled = Math.round((p / 100) * barWidth);
			const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
			const leftStr = `${String(p).padStart(3)}% left`;
			const resetStr = data?.resetAt ? ` ${formatResetTime(data.resetAt)}` : "";
			return ` ${label.padEnd(10)} [${bar}] ${leftStr}${resetStr}`;
		};

		// Progress bar rows
		lines.push(row("", "", renderBar("5h Limit", snapshot?.primary), ""));
		lines.push(row("", "", renderBar("Weekly", snapshot?.secondary), ""));

		// Credits row
		const creditInfo = snapshot?.credits;
		const creditStr = creditInfo
			? creditInfo.unlimited
				? "unlimited"
				: `${creditInfo.balance} credits`
			: "0 credits";
		lines.push(row("", "", ` ${"Credits".padEnd(10)} ${creditStr}`, ""));

		// Row separator or bottom border
		if (i < accounts.length - 1) {
			lines.push(hLine(BOX.midLeft, BOX.cross, BOX.midRight));
		}
	});

	// Bottom border
	lines.push(hLine(BOX.bottomLeft, BOX.midBottom, BOX.bottomRight));

	return lines;
}
