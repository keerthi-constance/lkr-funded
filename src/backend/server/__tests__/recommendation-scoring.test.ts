import { describe, it, expect } from "vitest";
import { scoreProject, type ScorableProject, type InvestorPreferences } from "../ai";

function project(overrides: Partial<ScorableProject> = {}): ScorableProject {
  return {
    category: "Renewable Energy",
    tags: [],
    title: "Solar Desalination Unit",
    tagline: "Off-grid water purification powered by solar panels",
    abstract: "A low-cost solar desalination system for coastal communities.",
    goal: 100_000,
    raised: 20_000,
    ...overrides,
  };
}

function prefs(overrides: Partial<InvestorPreferences> = {}): InvestorPreferences {
  return { categories: [], sectors: [], keywords: [], ...overrides };
}

describe("scoreProject", () => {
  it("ranks a clearly matching project above a non-matching one", () => {
    const matching = project({ category: "Renewable Energy" });
    const nonMatching = project({
      category: "Healthcare",
      title: "Cardiac Monitoring Wearable",
      tagline: "Wearable ECG for rural clinics",
      abstract: "A low-power wearable for remote cardiac monitoring.",
    });
    const preferences = prefs({
      categories: ["Renewable Energy"],
      keywords: ["solar", "water", "desalination"],
    });

    const matchScore = scoreProject(matching, preferences);
    const nonMatchScore = scoreProject(nonMatching, preferences);

    expect(matchScore.score).toBeGreaterThan(nonMatchScore.score);
  });

  it("is deterministic for identical inputs", () => {
    const p = project();
    const prefsIn = prefs({ categories: ["Renewable Energy"], keywords: ["solar"] });
    const a = scoreProject(p, prefsIn);
    const b = scoreProject(p, prefsIn);
    expect(a).toEqual(b);
  });

  it("handles empty/missing preferences without throwing", () => {
    expect(() => scoreProject(project(), null)).not.toThrow();
    expect(() => scoreProject(project(), undefined)).not.toThrow();
    const score = scoreProject(project(), prefs());
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it("different preferences produce different recommendations", () => {
    const p = project();
    const scoreA = scoreProject(p, prefs({ categories: ["Renewable Energy"] }));
    const scoreB = scoreProject(p, prefs({ categories: ["Healthcare"] }));
    expect(scoreA.score).not.toEqual(scoreB.score);
  });

  it("rewards donation-range compatibility and penalizes a mismatch", () => {
    const p = project({ goal: 100_000, raised: 90_000 }); // remaining = 10,000
    const inRange = scoreProject(p, prefs({ minAmount: 5_000, maxAmount: 20_000 }));
    const outOfRange = scoreProject(p, prefs({ minAmount: 500_000, maxAmount: 1_000_000 }));
    expect(inRange.budgetScore).toBeGreaterThan(outOfRange.budgetScore);
  });

  it("never returns a score outside [0, 100]", () => {
    const p = project({ goal: 1, raised: 0 });
    const preferences = prefs({ categories: ["Something Else"], keywords: ["unrelated"] });
    const result = scoreProject(p, preferences);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
