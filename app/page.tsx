"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  AlertCircle,
  Apple,
  Calendar,
  ChevronRight,
  Flame,
  LineChart,
  MessageSquare,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { DailyTrendList } from "@/components/features/daily-trend-list";
import { PageHeader } from "@/components/features/page-header";
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
  normalizeFoodLogResponse,
  normalizeFoodLogsResponse,
  normalizeGoalsResponse,
  normalizeMealPlansResponse,
  normalizeProfileResponse,
  normalizeUserStatsResponse,
} from "@/lib/api";
import { dashboardRangeDays, dashboardRangeLabels } from "@/lib/settings";
import { useAppSettings } from "@/lib/use-app-settings";
import { useSessionUser } from "@/lib/use-session-user";
import { cn } from "@/lib/utils";

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");

type DashboardMetric = {
  key: string;
  title: string;
  description: string;
  value: string;
  progress?: number;
  icon: typeof Flame;
};

type QuickAction = {
  key: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

export default function DashboardPage() {
  const { userId } = useSessionUser();
  const { data: settingsData } = useAppSettings();
  const settings = settingsData?.settings;
  const dashboardRange = settings?.defaultDashboardRange ?? "DAYS_30";
  const rangeDays = dashboardRangeDays[dashboardRange];
  const startDate = format(subDays(today, rangeDays - 1), "yyyy-MM-dd");
  const compactMode = settings?.compactMode ?? false;

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["foodLog", userId, todayStr],
    queryFn: async () => {
      const result = await api.api["food-logs"]({ date: todayStr }).get();
      if (result.error || !("log" in result.data)) return null;
      return normalizeFoodLogResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals", "dashboard"],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: { status: "ACTIVE" },
      });
      if (result.error || !("goals" in result.data)) return null;
      return normalizeGoalsResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile.get();
      if (result.error || !("profile" in result.data)) return null;
      return normalizeProfileResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", userId, startDate],
    queryFn: async () => {
      const result = await api.api.profile.stats.get({
        query: { startDate, endDate: todayStr },
      });
      if (result.error || !("dailyTotals" in result.data)) return null;
      return normalizeUserStatsResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["mealPlans", "dashboard"],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get({
        query: { active: true },
      });
      if (result.error || !("plans" in result.data)) return null;
      return normalizeMealPlansResponse(result.data);
    },
    enabled: !!userId,
  });

  const { data: recentLogsData, isLoading: recentLogsLoading } = useQuery({
    queryKey: ["foodLogs", "recent", userId, startDate],
    queryFn: async () => {
      const result = await api.api["food-logs"].get({
        query: { startDate, endDate: todayStr },
      });
      if (result.error || !("logs" in result.data)) return null;
      return normalizeFoodLogsResponse(result.data);
    },
    enabled: !!userId,
  });

  const calories = Math.round(logData?.totals?.calories ?? 0);
  const protein = Math.round(logData?.totals?.protein ?? 0);
  const targetCalories = profileData?.profile?.targetCalories ?? 2000;
  const targetProtein = profileData?.profile?.targetProtein ?? 150;
  const activeGoals = goalsData?.goals ?? [];
  const activePlans = mealPlansData?.plans ?? [];
  const stats = statsData;
  const isLoading =
    logLoading ||
    goalsLoading ||
    profileLoading ||
    statsLoading ||
    mealPlansLoading ||
    recentLogsLoading;

  const metrics: DashboardMetric[] = [
    settings?.showCaloriesOnDashboard !== false
      ? {
          key: "calories",
          title: "Calories today",
          description: "Current intake against your target",
          value: `${calories} / ${targetCalories}`,
          progress: (calories / targetCalories) * 100,
          icon: Flame,
        }
      : null,
    settings?.showProteinOnDashboard !== false
      ? {
          key: "protein",
          title: "Protein today",
          description: "Daily protein progress",
          value: `${protein}g / ${targetProtein}g`,
          progress: (protein / targetProtein) * 100,
          icon: Apple,
        }
      : null,
    settings?.showStreakOnDashboard !== false
      ? {
          key: "streak",
          title: "Current streak",
          description: dashboardRangeLabels[dashboardRange],
          value: `${stats?.streak.current ?? 0} days`,
          icon: Calendar,
        }
      : null,
    {
      key: "goals",
      title: "Active goals",
      description: "Goals tracked in the workspace",
      value: `${activeGoals.length}`,
      icon: Target,
    },
  ].filter((metric): metric is DashboardMetric => metric !== null);

  const recentLogs = (recentLogsData?.logs ?? []).slice(0, 4);
  const quickActions: QuickAction[] = [];

  if (
    !profileData?.profile?.targetCalories ||
    !profileData?.profile?.targetProtein
  ) {
    quickActions.push({
      key: "profile",
      title: "Finish your nutrition targets",
      description:
        "Calories and protein targets are missing, so adherence reporting is partial.",
      href: "/profile",
      cta: "Complete profile",
    });
  }

  if (!activeGoals.length) {
    quickActions.push({
      key: "goals",
      title: "Create an active goal",
      description:
        "Add a calorie, protein, or weight goal so progress is tracked automatically.",
      href: "/goals",
      cta: "Set a goal",
    });
  }

  if (!activePlans.length) {
    quickActions.push({
      key: "plans",
      title: "Build a weekly meal plan",
      description: "Meal plans can now be applied directly into your food log.",
      href: "/plans",
      cta: "Create plan",
    });
  }

  const todayHasEntries = (logData?.log?.items?.length ?? 0) > 0;
  if (!todayHasEntries && !logLoading) {
    quickActions.push({
      key: "log-today",
      title: "Log your first meal today",
      description: "Nothing logged yet for today. Keep your streak going.",
      href: "/log",
      cta: "Open log",
    });
  }

  // Cap quick actions at 3 to avoid overwhelming the user
  const visibleQuickActions = quickActions.slice(0, 3);

  const averageCalories = Math.round(
    stats?.targetAdherence.calories.average ?? 0,
  );
  const averageProtein = Math.round(
    stats?.targetAdherence.protein.average ?? 0,
  );
  const calorieTargetHitDays =
    stats?.targetAdherence.calories.daysHitTarget ?? 0;
  const proteinTargetHitDays =
    stats?.targetAdherence.protein.daysHitTarget ?? 0;

  const profileIncomplete =
    !profileLoading &&
    profileData !== undefined &&
    (!profileData?.profile?.targetCalories || !profileData?.profile?.targetProtein);

  return (
    <div className="space-y-8">
      {profileIncomplete && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Profile targets are incomplete — calorie and macro adherence may not be accurate
          </p>
          <Link
            href="/profile"
            className="ml-4 shrink-0 text-sm font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
          >
            Complete profile
          </Link>
        </div>
      )}
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Review your current intake, range trends, and the next actions that keep nutrition tracking moving."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/goals">
              <Button variant="outline" className="rounded-xl">
                <Target className="mr-2 h-4 w-4" />
                View all goals
              </Button>
            </Link>
            <Link href={`/progress?range=${dashboardRange}`}>
              <Button variant="outline" className="rounded-xl">
                <LineChart className="mr-2 h-4 w-4" />
                View trends
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.key}
            className={cn(
              "app-surface",
              compactMode ? "gap-4 py-5" : undefined,
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                  {typeof metric.progress === "number" ? (
                    <Progress value={Math.min(metric.progress, 100)} />
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Range trends
            </CardTitle>
            <CardDescription>
              {dashboardRangeLabels[dashboardRange]} for intake, streaks, and
              target adherence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Average intake
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    {averageCalories} kcal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {averageProtein}g protein on average per logged day
                  </p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Target adherence
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    {calorieTargetHitDays}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    days met calorie target, {proteinTargetHitDays} met protein
                    target
                  </p>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Logging momentum
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    {stats?.streak.longest ?? 0} day longest streak
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stats?.daysLogged ?? 0} logged days in range
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <DailyTrendList
                title="Recent calorie trend"
                description="Latest logged days against your calorie target."
                days={stats?.dailyTotals ?? []}
                metric="calories"
                target={targetCalories}
                maxItems={6}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Next actions</CardTitle>
              <CardDescription>
                Fix setup gaps so the rest of the app becomes more useful.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleQuickActions.length ? (
                visibleQuickActions.map((action) => (
                  <Link key={action.key} href={action.href}>
                    <div className="rounded-2xl border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-accent/30">
                      <p className="font-medium">{action.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {action.description}
                      </p>
                      <div className="mt-3 inline-flex items-center text-sm font-medium text-primary">
                        {action.cta}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border bg-background/70 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Core setup looks healthy
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Profile targets, active goals, and meal plans are all
                    present. The fastest next step is to keep logging
                    consistently.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Recent logged days and activity density.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLogs.length ? (
                recentLogs.map((log) => (
                  <Link key={log.id} href={`/log?date=${log.date}`}>
                    <div className="rounded-2xl border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-accent/30">
                      <p className="font-medium">
                        {format(new Date(log.date), "EEEE, MMM d")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {log.items.length} logged item
                        {log.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent logged days yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <ShortcutCard
              href={`/progress?range=${dashboardRange}`}
              icon={LineChart}
              title="Progress"
              description="Explore range trends, consistency, and goal context in one place."
              cta="Open progress"
            />
            <ShortcutCard
              href="/assistant"
              icon={MessageSquare}
              title="AI Assistant"
              description="Log meals, review progress, and ask for meal-planning help."
              cta="Open assistant"
            />
            <ShortcutCard
              href="/log"
              icon={UtensilsCrossed}
              title="Food Log"
              description="Review today and edit entries without leaving the main flow."
              cta="Open food log"
            />
            <ShortcutCard
              href="/plans"
              icon={Calendar}
              title="Meal Plans"
              description="Keep weekly structure close and apply meals directly into a day."
              cta="Open plans"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: typeof MessageSquare;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Card className="app-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button variant="outline" className="w-full rounded-xl">
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
