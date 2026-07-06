import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/donor/watchlist")({
  component: WatchlistPage,
});

function WatchlistPage() {
  const [watched, setWatched] = useState<string[]>([projects[1].id, projects[4].id, projects[6].id]);
  const watchedProjects = projects.filter((p) => watched.includes(p.id));

  const remove = (id: string) => {
    setWatched((w) => w.filter((x) => x !== id));
    toast.success("Removed from watchlist.");
  };

  const recommended = projects.filter((p) => !watched.includes(p.id)).slice(0, 3);

  return (
    <DashboardShell role="donor">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground">Projects you're keeping an eye on.</p>
        </div>

        {watchedProjects.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {watchedProjects.map((p, i) => (
              <div key={p.id} className="relative">
                <ProjectCard project={p} index={i} />
                <button
                  onClick={() => remove(p.id)}
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-card hover:text-destructive"
                >
                  <Heart className="h-4 w-4 fill-current text-teal" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            <Heart className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-3">Your watchlist is empty. Bookmark projects from their detail page to track them here.</p>
          </div>
        )}

        <div>
          <h3 className="mb-4 font-display font-semibold">Recommended for you</h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
