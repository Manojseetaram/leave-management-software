"use client";

import React from "react";
import { cn } from "@/src/utils/format";
import { humanizeStatus } from "@/src/utils/format";

const statusColors: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  withdrawn: "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

export interface BadgeProps {
  status?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ status, children, className }: BadgeProps) {
  const key = status ?? String(children ?? "");
  const color = statusColors[key] ?? "bg-muted text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color,
        className,
      )}
    >
      {children ?? humanizeStatus(key)}
    </span>
  );
}

export default Badge;
