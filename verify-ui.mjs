import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderObsidianDashboard } from "./dist/lib/codex-status-ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load fixtures per AGENTS.md - account examples MUST come from test fixtures
const accountsFixture = JSON.parse(
    readFileSync(join(__dirname, "test/fixtures/openai-codex-accounts.json"), "utf-8")
);
const snapshotsFixture = JSON.parse(
    readFileSync(join(__dirname, "test/fixtures/codex-status-snapshots.json"), "utf-8")
);

// Transform accounts fixture to ManagedAccount format
const accounts = accountsFixture.accounts.map((acc, index) => ({
    index,
    accountId: acc.accountId,
    email: acc.email,
    plan: acc.plan,
    enabled: acc.enabled,
    addedAt: acc.addedAt,
    lastUsed: acc.lastUsed,
    rateLimitResetTimes: acc.rateLimitResetTimes || {},
    coolingDownUntil: acc.coolingDownUntil,
    cooldownReason: acc.cooldownReason,
}));

// Transform snapshots fixture from Map entries format to array
const snapshots = snapshotsFixture.map(([_key, snapshot]) => snapshot);

const activeIndex = accountsFixture.activeIndex || 0;

const lines = renderObsidianDashboard(accounts, activeIndex, snapshots);
console.log("\n--- UI CLEANUP VERIFICATION (using test fixtures) ---");
lines.forEach(l => console.log(l));
console.log("--- END ---");
