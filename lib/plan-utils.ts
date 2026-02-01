/**
 * Plan type normalization utilities
 * Centralizes plan label mapping used across storage, accounts, and status modules
 */

export const PLAN_TYPE_LABELS: Record<string, string> = {
	free: "Free",
	plus: "Plus",
	pro: "Pro",
	team: "Team",
	business: "Business",
	enterprise: "Enterprise",
	edu: "Edu",
};

/**
 * Normalize a plan type string to its canonical label.
 * @param planType - Raw plan type (e.g., "plus", "TEAM", "Pro")
 * @returns Normalized label (e.g., "Plus", "Team", "Pro") or undefined if invalid
 */
export function normalizePlanType(planType: unknown): string | undefined {
	if (typeof planType !== "string") return undefined;
	const trimmed = planType.trim();
	if (!trimmed) return undefined;
	const mapped = PLAN_TYPE_LABELS[trimmed.toLowerCase()];
	return mapped ?? trimmed;
}

/**
 * Same as normalizePlanType but returns empty string instead of undefined
 * (for contexts where a fallback string is needed)
 */
export function normalizePlanTypeOrEmpty(planType: unknown): string {
	return normalizePlanType(planType) ?? "";
}

/**
 * Same as normalizePlanType but returns a default value (e.g., "Free") instead of undefined
 * (for contexts where a fallback plan type is needed)
 */
export function normalizePlanTypeOrDefault(planType: unknown, defaultValue = "Free"): string {
	return normalizePlanType(planType) ?? defaultValue;
}
