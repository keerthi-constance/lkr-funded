// Client-callable server fns for the two investor AI features, mirroring
// the auth-functions.ts wrapper pattern (thin createServerFn shells around
// server/ai.ts, server-only logic never bundled to the client). Every
// handler starts with requireRole("donor") — authorization derived from the
// verified session, never from anything the client sends.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "./db";
import { ProjectModel, UserModel } from "./models";
import type { Project } from "@/lib/mock-data";
import { requireRole } from "./server/auth";
import {
  scoreProject,
  explainRecommendation,
  answerQuestion,
  checkRateLimit,
  type InvestorPreferences,
} from "./server/ai";

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}

const DEFAULT_PREFERENCES: InvestorPreferences = {
  categories: [],
  sectors: [],
  keywords: [],
};

export const getPreferences = createServerFn({ method: "GET" }).handler(
  async (): Promise<InvestorPreferences> => {
    const user = await requireRole("donor");
    await getDb();
    const doc = await UserModel.findOne({ username: user.username }).lean();
    const prefs = (doc as { preferences?: InvestorPreferences } | null)?.preferences;
    return serialize({ ...DEFAULT_PREFERENCES, ...prefs });
  },
);

const preferencesInput = z.object({
  categories: z.array(z.string()).default([]),
  sectors: z.array(z.string()).default([]),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  keywords: z.array(z.string()).default([]),
});

export const updatePreferences = createServerFn({ method: "POST" })
  .validator(preferencesInput)
  .handler(async ({ data }) => {
    const user = await requireRole("donor");
    await getDb();
    await UserModel.updateOne({ username: user.username }, { $set: { preferences: data } });
    return serialize({ ok: true });
  });

export type RecommendedProject = {
  project: Project;
  score: number;
  matchedCategories: string[];
  matchedKeywords: string[];
  explanation: string;
};

const MAX_RECOMMENDATIONS = 6;

// Recomputed on every request rather than cached — the project catalog in
// this app is small, so this is cheap, and it means a changed preference or
// a newly published project is reflected immediately (no stale cache to
// invalidate).
export const getRecommendations = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecommendedProject[]> => {
    const user = await requireRole("donor");
    await getDb();

    const [userDoc, projects] = await Promise.all([
      UserModel.findOne({ username: user.username }).lean(),
      ProjectModel.find({ status: "live" }).lean(),
    ]);
    const preferences =
      (userDoc as { preferences?: InvestorPreferences } | null)?.preferences ?? DEFAULT_PREFERENCES;

    // Deterministic eligibility filter (per spec: not an LLM decision) —
    // only published, live, not-yet-fully-funded projects are recommendable.
    const eligible = projects.filter((p) => p.status === "live" && p.raised < p.goal);

    const scored = eligible
      .map((p) => ({ project: p, score: scoreProject(p, preferences) }))
      .sort((a, b) => {
        if (b.score.score !== a.score.score) return b.score.score - a.score.score;
        // Deterministic tiebreak: favor projects closer to their goal.
        return b.project.raised / b.project.goal - a.project.raised / a.project.goal;
      })
      .slice(0, MAX_RECOMMENDATIONS);

    const results: RecommendedProject[] = await Promise.all(
      scored.map(async ({ project, score }) => ({
        project: serialize({ ...project, id: String(project._id) }) as unknown as Project,
        score: score.score,
        matchedCategories: score.matchedCategories,
        matchedKeywords: score.matchedKeywords,
        explanation: await explainRecommendation(project, score),
      })),
    );

    return results;
  },
);

const askAssistantInput = z.object({
  question: z.string().min(1).max(500),
});

export const askAssistant = createServerFn({ method: "POST" })
  .validator(askAssistantInput)
  .handler(async ({ data }) => {
    const user = await requireRole("donor");
    checkRateLimit(user.username);
    await getDb();
    const result = await answerQuestion(user, data.question);
    return serialize(result);
  });
