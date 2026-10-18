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
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <Link to="/project/$slug" params={{ slug: project.slug }} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={project.cover}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge className="bg-navy-deep/80 text-white backdrop-blur">{project.category}</Badge>
          </div>
          <div className="absolute right-3 top-3">
            <div className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-navy backdrop-blur">
              {project.university.short}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-teal/90 px-2.5 py-1 text-xs font-bold text-navy-deep backdrop-blur">
            <Sparkles className="h-3 w-3" /> {score} match
          </div>
        </div>
      </Link>

      <div className="p-5">
        <Link
          to="/project/$slug"
          params={{ slug: project.slug }}
          className="block font-display text-lg font-semibold leading-snug hover:text-teal"
        >
          {project.title}
        </Link>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.abstract}</p>

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
      </div>
    </motion.div>
  );
}
