import { describe, it, expect } from "vitest";

import {
	PLAN_TYPE_LABELS,
	normalizePlanType,
	normalizePlanTypeOrEmpty,
	normalizePlanTypeOrDefault,
} from "../lib/plan-utils.js";

describe("plan-utils", () => {
	describe("PLAN_TYPE_LABELS", () => {
		it("contains all expected plan types", () => {
			expect(PLAN_TYPE_LABELS).toEqual({
				free: "Free",
				plus: "Plus",
				pro: "Pro",
				team: "Team",
				business: "Business",
				enterprise: "Enterprise",
				edu: "Edu",
			});
		});
	});

	describe("normalizePlanType", () => {
		it("normalizes lowercase plan types", () => {
			expect(normalizePlanType("plus")).toBe("Plus");
			expect(normalizePlanType("pro")).toBe("Pro");
			expect(normalizePlanType("team")).toBe("Team");
			expect(normalizePlanType("free")).toBe("Free");
			expect(normalizePlanType("business")).toBe("Business");
			expect(normalizePlanType("enterprise")).toBe("Enterprise");
			expect(normalizePlanType("edu")).toBe("Edu");
		});

		it("normalizes uppercase plan types", () => {
			expect(normalizePlanType("PLUS")).toBe("Plus");
			expect(normalizePlanType("PRO")).toBe("Pro");
			expect(normalizePlanType("TEAM")).toBe("Team");
			expect(normalizePlanType("FREE")).toBe("Free");
		});

		it("normalizes mixed-case plan types", () => {
			expect(normalizePlanType("Plus")).toBe("Plus");
			expect(normalizePlanType("PlUs")).toBe("Plus");
			expect(normalizePlanType("tEaM")).toBe("Team");
		});

		it("preserves unknown plan types", () => {
			expect(normalizePlanType("CustomPlan")).toBe("CustomPlan");
			expect(normalizePlanType("premium")).toBe("premium");
			expect(normalizePlanType("VIP")).toBe("VIP");
		});

		it("trims whitespace from plan types", () => {
			expect(normalizePlanType("  plus  ")).toBe("Plus");
			expect(normalizePlanType("\tpro\n")).toBe("Pro");
		});

		it("returns undefined for non-strings", () => {
			expect(normalizePlanType(null)).toBeUndefined();
			expect(normalizePlanType(undefined)).toBeUndefined();
			expect(normalizePlanType(123)).toBeUndefined();
			expect(normalizePlanType({})).toBeUndefined();
			expect(normalizePlanType([])).toBeUndefined();
			expect(normalizePlanType(true)).toBeUndefined();
		});

		it("returns undefined for empty strings", () => {
			expect(normalizePlanType("")).toBeUndefined();
			expect(normalizePlanType("   ")).toBeUndefined();
			expect(normalizePlanType("\t\n")).toBeUndefined();
		});
	});

	describe("normalizePlanTypeOrEmpty", () => {
		it("returns normalized plan type for valid inputs", () => {
			expect(normalizePlanTypeOrEmpty("plus")).toBe("Plus");
			expect(normalizePlanTypeOrEmpty("PRO")).toBe("Pro");
			expect(normalizePlanTypeOrEmpty("CustomPlan")).toBe("CustomPlan");
		});

		it("returns empty string instead of undefined for invalid inputs", () => {
			expect(normalizePlanTypeOrEmpty(null)).toBe("");
			expect(normalizePlanTypeOrEmpty(undefined)).toBe("");
			expect(normalizePlanTypeOrEmpty("")).toBe("");
			expect(normalizePlanTypeOrEmpty(123)).toBe("");
		});
	});

	describe("normalizePlanTypeOrDefault", () => {
		it("returns normalized plan type for valid inputs", () => {
			expect(normalizePlanTypeOrDefault("plus")).toBe("Plus");
			expect(normalizePlanTypeOrDefault("PRO")).toBe("Pro");
		});

		it("returns 'Free' by default for invalid inputs", () => {
			expect(normalizePlanTypeOrDefault(null)).toBe("Free");
			expect(normalizePlanTypeOrDefault(undefined)).toBe("Free");
			expect(normalizePlanTypeOrDefault("")).toBe("Free");
		});

		it("allows custom default value", () => {
			expect(normalizePlanTypeOrDefault(null, "Unknown")).toBe("Unknown");
			expect(normalizePlanTypeOrDefault("", "N/A")).toBe("N/A");
		});
	});
});
