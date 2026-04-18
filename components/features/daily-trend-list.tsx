"use client";

import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { DailyTotal, NutritionTotals } from "@/lib/api";

type TrendMetricKey = keyof NutritionTotals;

interface DailyTrendListProps {
  title: string;
  description: string;
  days: DailyTotal[];
  metric: TrendMetricKey;
  suffix?: string;
  target?: number | null;
  maxItems?: number;
}

export function DailyTrendList({
  title,
  description,
  days,
  metric,
  suffix = "",
  target,
  maxItems = days.length,
}: DailyTrendListProps) {
  const items = days.slice(-maxItems);
  const maxValue = Math.max(...items.map((day) => day[metric]), 0);

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((day) => {
            const value = day[metric];
            const scale = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const targetScale =
              target && target > 0 ? Math.min((value / target) * 100, 100) : 0;

            return (
              <div key={`${metric}-${day.date}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {format(new Date(day.date), "EEE, MMM d")}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(value)}
                    {suffix}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={scale} />
                  {target ? (
                    <p className="text-[11px] text-muted-foreground">
                      {Math.round(targetScale)}% of target
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            No logged days in this range yet.
          </p>
        )}
      </div>
    </div>
  );
}
