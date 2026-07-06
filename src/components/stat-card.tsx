import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: any;
  accent?: "teal" | "gold" | "navy";
}) {
  const bg = accent === "gold" ? "bg-gold/15 text-gold" : accent === "navy" ? "bg-navy/10 text-navy" : "bg-teal/15 text-teal";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
