"use client";

import React from "react";
import { cn } from "@/src/utils/format";

export interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatCard({ label, value, icon, color, className }: StatCardProps) {
  return (
    <div className={cn("app-card flex items-center gap-4", className)}>
      {icon && (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-white",
            color ?? "bg-primary",
          )}
        >
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
