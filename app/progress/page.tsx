"use client";

import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, format, subDays } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  LineChart,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DailyTrendList } from "@/components/features/daily-trend-list";
import { PageHeader } from "@/components/features/page-header";
import { ProgressRangeSelector } from "@/components/features/progress-range-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type DailyStatHighlight,
  type DashboardRange,
  normalizeGoalsResponse,
  normalizeProfileResponse,
  normalizeUserStatsResponse,
} from "@/lib/api";
import { formatGoalTypeLabel, getGoalProgressPercentage } from "@/lib/goals";
import { dashboardRangeDays, dashboardRangeLabels } from "@/lib/settings";
import { useAppSettings } from "@/lib/use-app-settings";
import { useSessionUser } from "@/lib/use-session-user";

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");
const validRanges = new Set<DashboardRange>(["DAYS_7", "DAYS_30", "DAYS_90"]);

export default function ProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useSessionUser();
  const { data: settingsData } = useAppSettings();

  const requestedRange = searchParams.get("range");
  const selectedRange = validRanges.has(requestedRange as DashboardRange)
    ? (requestedRange as DashboardRange)
    : (settingsData?.settings.defaultDashboardRange ?? "DAYS_30");

  const rangeDays = dashboardRangeDays[selectedRange];
  const startDate = format(subDays(today, rangeDays - 1), "yyyy-MM-dd");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["progressStats", userId, selectedRange],
    queryFn: async () => {
      const result = await api.api.profile.stats.get({
        query: { startDate, endDate: todayStr },
      });
      if (result.error || !("dailyTotals" in result.data)) return null;
      return normalizeUserStatsResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile.get();
      if (result.error || !("profile" in result.data)) return null;
      return normalizeProfileResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: ["progressGoals", userId],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: { status: "ACTIVE" },
      });
      if (result.error || !("goals" in result.data)) return null;
      return normalizeGoalsResponse(result.data);
    },
    enabled: !!userId,
  });

  const handleRangeChange = (nextRange: DashboardRange) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("range", nextRange);
    router.replace(`/progress?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  };

  const dateLinks = new Map(
    eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(todayStr),
    }).map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      return [
        dateKey,
        `/log?date=${dateKey}&from=progress&range=${selectedRange}`,
      ];
    }),
  );

  const loggedDates = new Set(stats?.rangeSummary.loggedDates ?? []);
  const allDates = Array.from(dateLinks.keys());
  const missedDates = allDates
    .filter((date) => !loggedDates.has(date))
    .reverse();
  const loggedDays = (stats?.dailyTotals ?? []).slice().reverse();
  const activeGoals = goalsData?.goals ?? [];

  const calorieAdherence = toPercent(
    stats?.targetAdherence.calories.averageProgress ?? null,
  );
  const proteinAdherence = toPercent(
    stats?.targetAdherence.protein.averageProgress ?? null,
  );
  const previousCalorieAdherence = toPercent(
    calculateAverageProgress(
      stats?.previousPeriod?.averages.calories,
      stats?.targetAdherence.calories.target ?? null,
    ),
  );
  const previousProteinAdherence = toPercent(
    calculateAverageProgress(
      stats?.previousPeriod?.averages.protein,
      stats?.targetAdherence.protein.target ?? null,
    ),
  );

  const hasMissedDays = missedDates.length > 0;
  const lowProtein =
    proteinAdherence !== "—" && Number.parseInt(proteinAdherence) < 70;
  const noGoals = !goalsLoading && activeGoals.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="History"
        title="Progress"
        description="Explore range trends, consistency, and active goals without compressing everything into the dashboard."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ProgressRangeSelector
              value={selectedRange}
              onChange={handleRangeChange}
            />
            <Link
              href={`/log?date=${todayStr}&from=progress&range=${selectedRange}`}
            >
              <Button className="rounded-xl">
                <CalendarDays className="mr-2 h-4 w-4" />
                Open today
              </Button>
            </Link>
          </div>
        }
      />

      {(hasMissedDays || lowProtein || noGoals) && (
        <div className="space-y-2">
          {hasMissedDays && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {missedDates.length} day{missedDates.length === 1 ? "" : "s"}{" "}
                without a log entry in this range
              </p>
              <Link
                href={`/log?date=${missedDates[0]}&from=progress&range=${selectedRange}`}
                className="ml-4 shrink-0 text-sm font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
              >
                Open earliest missed day
              </Link>
            </div>
          )}
          {lowProtein && (
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/30">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Protein adherence is below 70% — consider adjusting your food
                choices
              </p>
              <Link
                href="/assistant?prompt=Suggest+high-protein+foods+to+help+me+hit+my+daily+protein+target"
                className="ml-4 shrink-0 text-sm font-semibold text-blue-800 underline-offset-2 hover:underline dark:text-blue-300"
              >
                Ask the assistant
              </Link>
            </div>
          )}
          {noGoals && (
            <div className="flex items-center justify-between rounded-xl border border-muted bg-muted/40 px-4 py-3">
              <p className="text-sm font-medium">
                No active goals — progress is measured against profile targets
                only
              </p>
              <Link
                href="/goals"
                className="ml-4 shrink-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                Create a goal
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          What you&apos;re measuring:
        </span>{" "}
        Adherence % compares your logged intake to your{" "}
        <Link
          href="/profile"
          className="text-primary underline-offset-2 hover:underline"
        >
          profile targets
        </Link>
        . Goals below are explicit time-bound goals you created separately. Both
        live in parallel — targets are your daily baseline, goals are your
        larger intentions.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressStatCard
          title="Days logged"
          value={`${stats?.daysLogged ?? 0}`}
          description={dashboardRangeLabels[selectedRange]}
          detail={
            stats?.previousPeriod
              ? `${stats.previousPeriod.daysLogged} in previous period`
              : "No previous period"
          }
          icon={CalendarDays}
          loading={statsLoading}
        />
        <ProgressStatCard
          title="Current streak"
          value={`${stats?.streak.current ?? 0} days`}
          description="Consecutive logged days"
          detail={`Longest streak: ${stats?.streak.longest ?? 0} days`}
          icon={TrendingUp}
          loading={statsLoading}
        />
        <ProgressStatCard
          title="Calorie adherence"
          value={calorieAdherence}
          description="Average vs calorie target"
          detail={buildDeltaLabel(calorieAdherence, previousCalorieAdherence)}
          icon={Flame}
          loading={statsLoading}
        />
        <ProgressStatCard
          title="Protein adherence"
          value={proteinAdherence}
          description="Average vs protein target"
          detail={buildDeltaLabel(proteinAdherence, previousProteinAdherence)}
          icon={Target}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Daily trends
            </CardTitle>
            <CardDescription>
              Macro trends for{" "}
              {dashboardRangeLabels[selectedRange].toLowerCase()}.
            </CardDescription>
            {!profileData?.profile?.targetCalories && (
              <p className="mt-1 text-xs text-muted-foreground">
                Charts show raw intake — no target lines yet.{" "}
                <Link
                  href="/profile"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Set targets in your profile
                </Link>{" "}
                to see adherence bands.
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {statsLoading ? (
              <>
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
              </>
            ) : (
              <>
                <DailyTrendList
                  title="Calories"
                  description="Logged calorie totals by day."
                  days={loggedDays}
                  metric="calories"
                  target={stats?.targetAdherence.calories.target}
                />
                <DailyTrendList
                  title="Protein"
                  description="Protein intake trend across the range."
                  days={loggedDays}
                  metric="protein"
                  suffix="g"
                  target={stats?.targetAdherence.protein.target}
                />
                <DailyTrendList
                  title="Carbs"
                  description="Carb intake by logged day."
                  days={loggedDays}
                  metric="carbs"
                  suffix="g"
                  target={stats?.targetAdherence.carbs.target}
                />
                <DailyTrendList
                  title="Fat"
                  description="Fat intake by logged day."
                  days={loggedDays}
                  metric="fat"
                  suffix="g"
                  target={stats?.targetAdherence.fat.target}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>
                Quick peaks and dips from the selected range.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <HighlightRow
                label="Highest calories"
                highlight={stats?.bestDay.calories ?? null}
                loading={statsLoading}
              />
              <HighlightRow
                label="Lowest calories"
                highlight={stats?.lowestDay.calories ?? null}
                loading={statsLoading}
              />
              <HighlightRow
                label="Highest protein"
                highlight={stats?.bestDay.protein ?? null}
                loading={statsLoading}
              />
              <HighlightRow
                label="Lowest protein"
                highlight={stats?.lowestDay.protein ?? null}
                loading={statsLoading}
              />
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Meal pattern</CardTitle>
              <CardDescription>
                Where most calories and protein are showing up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <>
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                </>
              ) : (
                stats?.mealTypeBreakdown.map((entry) => (
                  <div
                    key={entry.mealType}
                    className="rounded-2xl border bg-background/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize">
                        {entry.mealType.toLowerCase()}
                      </p>
                      <Badge variant="secondary">
                        {entry.loggedDays} logged day
                        {entry.loggedDays === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {Math.round(entry.totals.calories)} kcal total,{" "}
                      {Math.round(entry.averagePerLoggedDay.protein)}g protein
                      on average when this meal appears.
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle>Consistency</CardTitle>
            <CardDescription>
              Logged vs missed days across the current range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Logged days
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {stats?.daysLogged ?? 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Days with at least one logged item.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Missed days
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {missedDates.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Range days without a food log.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent logged days</p>
                {loggedDays.length ? (
                  loggedDays.slice(0, 6).map((day) => (
                    <Link
                      key={day.date}
                      href={dateLinks.get(day.date) ?? "/log"}
                      className="flex items-center justify-between rounded-2xl border bg-background/70 p-3 text-sm transition hover:border-primary/40 hover:bg-accent/20"
                    >
                      <span>{format(new Date(day.date), "EEE, MMM d")}</span>
                      <span className="text-muted-foreground">
                        {Math.round(day.calories)} kcal
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No logged days in this range yet.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Recent missed days</p>
                {missedDates.length ? (
                  missedDates.slice(0, 6).map((date) => (
                    <Link
                      key={date}
                      href={dateLinks.get(date) ?? "/log"}
                      className="flex items-center justify-between rounded-2xl border bg-background/70 p-3 text-sm transition hover:border-primary/40 hover:bg-accent/20"
                    >
                      <span>{format(new Date(date), "EEE, MMM d")}</span>
                      <span className="text-muted-foreground">Start log</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No missed days in this range.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>Goal context</CardTitle>
            <CardDescription>
              Active goals summarized against the current range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsLoading ? (
              <>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : activeGoals.length ? (
              activeGoals.map((goal) => {
                const progressValue = getGoalProgressPercentage(
                  goal.currentValue,
                  goal.targetValue,
                );

                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium capitalize">
                          {formatGoalTypeLabel(goal.type)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {Math.round(goal.currentValue)}
                          {goal.unit} of {Math.round(goal.targetValue)}
                          {goal.unit}
                        </p>
                      </div>
                      {goal.derivedProgress ? (
                        <Badge variant="secondary">Auto-tracked</Badge>
                      ) : null}
                    </div>
                    <Progress className="mt-3" value={progressValue} />
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="font-medium">No active goals</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a goal so progress has a target besides daily
                  adherence.
                </p>
                <Link
                  href="/goals"
                  className="mt-3 inline-flex items-center text-sm font-medium text-primary"
                >
                  Open goals
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            )}

            <div className="rounded-2xl border bg-background/70 p-4">
              <p className="text-sm font-medium">Weekday averages</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(stats?.weekdayAverages ?? []).map((weekday) => (
                  <div
                    key={weekday.weekday}
                    className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{weekday.label}</span>
                      <span className="text-muted-foreground">
                        {weekday.loggedDays}x
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(weekday.averages.calories)} kcal,{" "}
                      {Math.round(weekday.averages.protein)}g protein avg
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Need help interpreting these trends?
        </p>
        <Link
          href="/assistant?prompt=Explain+my+nutrition+progress+this+week+and+suggest+improvements"
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Ask the assistant
        </Link>
      </div>
    </div>
  );
}

function ProgressStatCard({
  title,
  value,
  description,
  detail,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  detail: string;
  icon: typeof CalendarDays;
  loading: boolean;
}) {
  return (
    <Card className="app-surface">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            <p className="text-xs font-medium text-foreground/80">{detail}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HighlightRow({
  label,
  highlight,
  loading,
}: {
  label: string;
  highlight: DailyStatHighlight | null;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-20 rounded-2xl" />;
  }

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      {highlight ? (
        <>
          <p className="mt-2 font-medium">
            {format(new Date(highlight.date), "EEEE, MMM d")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {Math.round(highlight.totals.calories)} kcal,{" "}
            {Math.round(highlight.totals.protein)}g protein
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No logged day in range yet.
        </p>
      )}
    </div>
  );
}

function calculateAverageProgress(
  average: number | undefined,
  target: number | null,
) {
  if (average === undefined || target === null || target <= 0) {
    return null;
  }

  return average / target;
}

function toPercent(value: number | null) {
  if (value === null) {
    return "No target";
  }

  return `${Math.round(value * 100)}%`;
}

function buildDeltaLabel(current: string, previous: string) {
  if (current === "No target" || previous === "No target") {
    return "Set a target to compare periods";
  }

  const currentValue = Number.parseInt(current, 10);
  const previousValue = Number.parseInt(previous, 10);
  const delta = currentValue - previousValue;

  if (delta === 0) {
    return "Flat vs previous period";
  }

  return `${delta > 0 ? "+" : ""}${delta} pts vs previous period`;
}
