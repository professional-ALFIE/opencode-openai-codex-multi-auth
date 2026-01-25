import { stdin as input, stdout as output } from "node:process";

const AUTH_DEBUG_ENABLED = process.env.OPENCODE_OPENAI_AUTH_DEBUG === "1";

function debug(...args: unknown[]): void {
	if (!AUTH_DEBUG_ENABLED) return;
	console.debug(...args);
}

function disableMouseTracking(): void {
	if (!output.isTTY) return;
	// Disable common xterm mouse tracking modes.
	output.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l");
}

function enableMouseTracking(): void {
	if (!output.isTTY) return;
	output.write("\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h");
}

/**
 * Run an interactive prompt without breaking OpenCode's TUI.
 *
 * OpenCode enables raw mode and mouse tracking for its UI. Node's readline can
 * toggle raw mode on close, which can leave mouse tracking enabled but raw mode
 * disabled — causing mouse movements to appear as garbage input (e.g. "M2^J").
 */
export async function withTerminalModeRestored<T>(fn: () => Promise<T>): Promise<T> {
	if (!input.isTTY) {
		debug("[TerminalGuard] No TTY detected, skipping terminal guard");
		return await fn();
	}

	const wasRaw = (input as unknown as { isRaw?: boolean }).isRaw;
	debug(`[TerminalGuard] Starting guard - wasRaw: ${wasRaw}, isTTY: ${input.isTTY}`);

	try {
		debug("[TerminalGuard] Disabling mouse tracking");
		disableMouseTracking();
		// Ensure we can accept normal line input during prompts.
		if (typeof input.setRawMode === "function") {
			debug("[TerminalGuard] Setting raw mode to false");
			input.setRawMode(false);
		}
		return await fn();
	} finally {
		debug(`[TerminalGuard] Restoring terminal state - wasRaw: ${wasRaw}`);
		if (typeof wasRaw === "boolean" && typeof input.setRawMode === "function") {
			input.setRawMode(wasRaw);
		}
		// If OpenCode was previously in raw mode, re-enable mouse tracking so the UI
		// doesn't get stuck in a non-mouse state.
		if (wasRaw) {
			debug("[TerminalGuard] Re-enabling mouse tracking");
			enableMouseTracking();
		}
	}
}
