import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, LayoutGrid, List } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { categories, universities } from "@/lib/mock-data";
import { getProjects } from "@/backend/functions";

export const Route = createFileRoute("/browse")({
  loader: () => getProjects(),
  head: () => ({
    meta: [
      { title: "Browse Projects — FundEd" },
      { name: "description", content: "Discover verified university research projects funding now." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const projects = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [uni, setUni] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "funded" | "ending">("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (q && !`${p.title} ${p.tagline}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (uni && p.university.short !== uni) return false;
      return true;
    });
    if (sort === "funded") list = [...list].sort((a, b) => b.raised / b.goal - a.raised / a.goal);
    if (sort === "ending") list = [...list].sort((a, b) => a.daysLeft - b.daysLeft);
    return list;
  }, [q, cat, uni, sort]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Explore Projects</h1>
          <p className="mt-2 text-muted-foreground">
            {filtered.length} verified research projects seeking funding.
          </p>
        </div>

        <div className="sticky top-16 z-30 -mx-4 mb-8 rounded-none border-y border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects, keywords, students..."
                className="pl-9"
              />
            </div>
            <select
              value={cat ?? ""}
              onChange={(e) => setCat(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={uni ?? ""}
              onChange={(e) => setUni(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Universities</option>
              {universities.map((u) => <option key={u.short} value={u.short}>{u.name}</option>)}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="funded">Most Funded</option>
              <option value="ending">Ending Soon</option>
            </select>
            <div className="flex overflow-hidden rounded-md border border-input">
              <button onClick={() => setView("grid")} className={`grid h-10 w-10 place-items-center ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setView("list")} className={`grid h-10 w-10 place-items-center ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {(cat || uni || q) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {cat && <Badge variant="secondary" className="cursor-pointer" onClick={() => setCat(null)}>{cat} ×</Badge>}
              {uni && <Badge variant="secondary" className="cursor-pointer" onClick={() => setUni(null)}>{uni} ×</Badge>}
              {q && <Badge variant="secondary" className="cursor-pointer" onClick={() => setQ("")}>"{q}" ×</Badge>}
              <button onClick={() => { setCat(null); setUni(null); setQ(""); }} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="text-5xl">🔍</div>
            <h3 className="mt-4 font-display text-xl font-semibold">No projects match your filters</h3>
            <p className="mt-1 text-muted-foreground">Try clearing filters or broadening your search.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const pct = Math.min(100, Math.round((p.raised / p.goal) * 100));
              return (
                <Link
                  key={p.id}
                  to="/project/$slug"
                  params={{ slug: p.slug }}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:shadow-elevated"
                >
                  <img src={p.cover} alt="" className="h-28 w-40 flex-none rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><Badge className="bg-navy text-white">{p.category}</Badge><span className="text-xs text-muted-foreground">{p.university.name}</span></div>
                        <h3 className="mt-1 truncate font-display text-lg font-semibold">{p.title}</h3>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{p.tagline}</p>
                      </div>
                      <div className="text-right"><div className="font-bold text-teal">{pct}%</div><div className="text-xs text-muted-foreground">{p.daysLeft}d left</div></div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-teal-gradient" style={{ width: `${pct}%` }} /></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
