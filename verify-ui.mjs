import { renderObsidianDashboard } from "./dist/lib/codex-status-ui.js";

const mockAccounts = [
    {
        index: 0,
        accountId: "acc_123",
        email: "bfont39@live.com",
        plan: "Plus",
        enabled: true,
        addedAt: Date.now(),
        lastUsed: Date.now(),
        rateLimitResetTimes: {},
    }
];

const mockSnapshots = [
    {
        accountId: "acc_123",
        email: "bfont39@live.com",
        plan: "Plus",
        updatedAt: Date.now(),
        primary: { usedPercent: 0, windowMinutes: 300, resetAt: Date.now() + 3600000 },
        secondary: { usedPercent: 100, windowMinutes: 10080, resetAt: Date.now() + 86400000 },
        credits: { hasCredits: true, unlimited: false, balance: "0" }
    }
];

const lines = renderObsidianDashboard(mockAccounts, 0, mockSnapshots);
console.log("\n--- UI CLEANUP VERIFICATION ---");
lines.forEach(l => console.log(l));
console.log("--- END ---");
