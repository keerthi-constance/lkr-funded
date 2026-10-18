import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Clock } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { formatRs } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const pct = Math.min(100, Math.round((project.raised / project.goal) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/project/$slug"
        params={{ slug: project.slug }}
        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
      >
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
        </div>
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
            {project.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.tagline}</p>

          <div className="mt-4 flex items-center gap-2">
            <img src={project.student.avatar} alt="" className="h-7 w-7 rounded-full bg-muted" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{project.student.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{project.student.department}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="h-full bg-teal-gradient"
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold">{formatRs(project.raised)}</div>
                <div className="text-[11px] text-muted-foreground">raised of {formatRs(project.goal)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-teal">{pct}%</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {project.donors} donors</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {project.daysLeft > 0 ? `${project.daysLeft} days left` : "Funded"}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
