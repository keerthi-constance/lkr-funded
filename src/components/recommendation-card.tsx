import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { formatRs } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import type { RecommendedProject } from "@/backend/ai-functions";

export function RecommendationCard({ rec, index = 0 }: { rec: RecommendedProject; index?: number }) {
  const { project, score, explanation } = rec;
  const pct = Math.min(100, Math.round((project.raised / project.goal) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="bg-navy-deep/80 text-white">{project.category}</Badge>
            <Badge variant="outline">{project.university.short}</Badge>
          </div>
          <Link
            to="/project/$slug"
            params={{ slug: project.slug }}
            className="mt-2 block font-display text-lg font-semibold leading-snug hover:text-teal"
          >
            {project.title}
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-xl bg-teal/10 px-3 py-2 text-teal">
          <Sparkles className="h-4 w-4" />
          <span className="mt-1 text-sm font-bold">{score}</span>
          <span className="text-[10px] uppercase tracking-wide">match</span>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.abstract}</p>

      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Why this?</span> {explanation}
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-teal-gradient" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <div>
            <span className="font-semibold">{formatRs(project.raised)}</span>
            <span className="text-xs text-muted-foreground"> raised of {formatRs(project.goal)}</span>
          </div>
          <span className="font-bold text-teal">{pct}%</span>
        </div>
      </div>

      <Link
        to="/project/$slug"
        params={{ slug: project.slug }}
        className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
      >
        View Project
      </Link>
    </motion.div>
  );
}
