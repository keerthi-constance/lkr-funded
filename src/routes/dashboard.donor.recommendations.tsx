import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { RecommendationCard } from "@/components/recommendation-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { categories } from "@/lib/mock-data";
import {
  getPreferences,
  updatePreferences,
  getRecommendations,
} from "@/backend/ai-functions";

export const Route = createFileRoute("/dashboard/donor/recommendations")({
  loader: async () => ({ preferences: await getPreferences() }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const { preferences: initialPreferences } = Route.useLoaderData();
  const queryClient = useQueryClient();

  const [categoriesState, setCategoriesState] = useState<string[]>(initialPreferences.categories);
  const [keywordsInput, setKeywordsInput] = useState(initialPreferences.keywords.join(", "));
  const [minAmount, setMinAmount] = useState(initialPreferences.minAmount?.toString() ?? "");
  const [maxAmount, setMaxAmount] = useState(initialPreferences.maxAmount?.toString() ?? "");

  const recommendationsQuery = useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: () => getRecommendations(),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePreferences({
        data: {
          categories: categoriesState,
          sectors: [],
          keywords: keywordsInput
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          minAmount: minAmount ? Number(minAmount) : undefined,
          maxAmount: maxAmount ? Number(maxAmount) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Preferences saved — refreshing recommendations.");
      queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save preferences.");
    },
  });

  function toggleCategory(c: string) {
    setCategoriesState((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <DashboardShell role="donor">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">For You</h1>
          <p className="text-muted-foreground">
            Research projects matched to your interests and preferred donation range.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold">Your preferences</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preferred sectors
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCategory(c)}>
                    <Badge
                      variant={categoriesState.includes(c) ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      {c}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Keywords or topics (comma-separated)
              </label>
              <Input
                className="mt-2"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="e.g. water, solar, machine learning"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Min donation range (Rs)
                </label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="e.g. 1000"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Max donation range (Rs)
                </label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save preferences & refresh"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display font-semibold">
            <Sparkles className="h-4 w-4 text-teal" /> Recommended Projects for You
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] })}
            disabled={recommendationsQuery.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recommendationsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {recommendationsQuery.isPending ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Finding projects that match your preferences…
          </div>
        ) : recommendationsQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-destructive">
            Couldn't load recommendations right now. Try refreshing.
          </div>
        ) : recommendationsQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            There are no live, fundable projects right now — check back soon.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendationsQuery.data.map((rec, i) => (
              <RecommendationCard key={rec.project.slug} rec={rec} index={i} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
