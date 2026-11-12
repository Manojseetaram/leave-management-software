"use client";

import React from "react";
import { cn } from "@/src/utils/format";
import { humanizeStatus } from "@/src/utils/format";

const statusColors: Record<string, string> = {
  draft: "bg-white text-black border border-black",
  pending: "bg-[#1E90FF]/10 text-[#1E90FF]",
  changes_requested: "bg-black text-white",
  approved: "bg-[#1E90FF] text-white",
  rejected: "bg-black text-white",
  withdrawn: "bg-white text-black border border-black",
  completed: "bg-[#1E90FF]/20 text-[#1E90FF]",
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
