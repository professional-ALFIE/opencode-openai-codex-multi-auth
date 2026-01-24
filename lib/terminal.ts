import { stdin as input, stdout as output } from "node:process";

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
	if (!input.isTTY) return await fn();

	const wasRaw = (input as unknown as { isRaw?: boolean }).isRaw;

	try {
		disableMouseTracking();
		// Ensure we can accept normal line input during prompts.
		if (typeof input.setRawMode === "function") input.setRawMode(false);
		return await fn();
	} finally {
		if (typeof wasRaw === "boolean" && typeof input.setRawMode === "function") {
			input.setRawMode(wasRaw);
		}
		// If OpenCode was previously in raw mode, re-enable mouse tracking so the UI
		// doesn't get stuck in a non-mouse state.
		if (wasRaw) enableMouseTracking();
	}
}
