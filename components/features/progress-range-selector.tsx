"use client";

import { Button } from "@/components/ui/button";
import type { DashboardRange } from "@/lib/api";
import { dashboardRangeLabels } from "@/lib/settings";
import { cn } from "@/lib/utils";

interface ProgressRangeSelectorProps {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
}

const ranges = Object.keys(dashboardRangeLabels) as DashboardRange[];

export function ProgressRangeSelector({
  value,
  onChange,
}: ProgressRangeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map((range) => (
        <Button
          key={range}
          type="button"
          variant="outline"
          className={cn(
            "rounded-xl",
            value === range
              ? "border-primary bg-primary/8 text-primary"
              : "bg-background/80",
          )}
          onClick={() => onChange(range)}
        >
          {dashboardRangeLabels[range]}
        </Button>
      ))}
    </div>
  );
}
