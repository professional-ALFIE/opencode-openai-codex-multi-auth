import type { PluginConfig } from "./types.js";

import { getPerProjectAccounts, loadPluginConfig } from "./config.js";
import { configureStorageForCwd } from "./storage.js";

export function configureStorageForPluginConfig(
	pluginConfig: PluginConfig,
	cwd: string = process.cwd(),
): ReturnType<typeof configureStorageForCwd> {
	const perProjectAccounts = getPerProjectAccounts(pluginConfig);
	return configureStorageForCwd({ cwd, perProjectAccounts });
}

export function configureStorageForCurrentCwd(): ReturnType<
	typeof configureStorageForCwd
> {
	const pluginConfig = loadPluginConfig();
	return configureStorageForPluginConfig(pluginConfig, process.cwd());
}
