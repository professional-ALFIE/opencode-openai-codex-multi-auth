import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { AccountStorageV3 } from "./types.js";

const STORAGE_FILE = "openai-codex-accounts.json";

function getOpencodeConfigDir(): string {
	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	if (xdgConfigHome && xdgConfigHome.trim()) {
		return join(xdgConfigHome, "opencode");
	}
	return join(homedir(), ".config", "opencode");
}

function getLegacyOpencodeDir(): string {
	return join(homedir(), ".opencode");
}

export function getStoragePath(): string {
	return join(getOpencodeConfigDir(), STORAGE_FILE);
}

function getLegacyStoragePath(): string {
	return join(getLegacyOpencodeDir(), STORAGE_FILE);
}

async function migrateLegacyAccountsFileIfNeeded(): Promise<void> {
	const newPath = getStoragePath();
	if (existsSync(newPath)) return;

	const legacyPath = getLegacyStoragePath();
	if (!existsSync(legacyPath)) return;

	await fs.mkdir(dirname(newPath), { recursive: true });
	try {
		await fs.rename(legacyPath, newPath);
	} catch {
		try {
			await fs.copyFile(legacyPath, newPath);
			await fs.unlink(legacyPath);
		} catch {
			// Best-effort; ignore.
		}
	}
}

export async function loadAccounts(): Promise<AccountStorageV3 | null> {
	await migrateLegacyAccountsFileIfNeeded();
	const filePath = getStoragePath();
	try {
		if (!existsSync(filePath)) return null;
		const raw = await fs.readFile(filePath, "utf-8");
		const parsed = JSON.parse(raw) as unknown;

		if (!parsed || typeof parsed !== "object") return null;
		const storage = parsed as Partial<AccountStorageV3>;
		if (storage.version !== 3) return null;
		if (!Array.isArray(storage.accounts)) return null;

		const activeIndex =
			typeof storage.activeIndex === "number" && Number.isFinite(storage.activeIndex)
				? Math.max(0, Math.floor(storage.activeIndex))
				: 0;
		const clampedActiveIndex =
			storage.accounts.length > 0
				? Math.min(activeIndex, storage.accounts.length - 1)
				: 0;

		return {
			version: 3,
			accounts: storage.accounts as AccountStorageV3["accounts"],
			activeIndex: clampedActiveIndex,
			activeIndexByFamily: storage.activeIndexByFamily ?? {},
		};
	} catch {
		return null;
	}
}

export async function saveAccounts(storage: AccountStorageV3): Promise<void> {
	const filePath = getStoragePath();
	await fs.mkdir(dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(storage, null, 2), "utf-8");
}
