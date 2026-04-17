"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Apple,
  Calendar,
  Flame,
  MessageSquare,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { dashboardRangeDays, dashboardRangeLabels } from "@/lib/settings";
import { useAppSettings } from "@/lib/use-app-settings";
import { useSessionUser } from "@/lib/use-session-user";
import { cn } from "@/lib/utils";

const todayStr = format(new Date(), "yyyy-MM-dd");
type DashboardMetric = {
  key: string;
  title: string;
  description: string;
  value: string;
  icon: typeof Flame;
};

export default function DashboardPage() {
  const { userId } = useSessionUser();
  const { data: settingsData } = useAppSettings();
  const settings = settingsData?.settings;
  const dashboardRange = settings?.defaultDashboardRange ?? "DAYS_30";
  const rangeDays = dashboardRangeDays[dashboardRange];
  const startDate = format(subDays(new Date(), rangeDays), "yyyy-MM-dd");
  const compactMode = settings?.compactMode ?? false;

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["foodLog", userId, todayStr],
    queryFn: async () => {
      const result = await api.api["food-logs"]({ date: todayStr }).get();
      if (result.error) return null;

      return result.data as {
        totals: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      } | null;
    },
    enabled: !!userId,
  });

  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: { status: "ACTIVE" },
      });
      if (result.error) return null;
      return result.data;
    },
    enabled: !!userId,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile.get();
      if (result.error) return null;
      return result.data as {
        profile: {
          targetCalories: number | null;
          targetProtein: number | null;
        };
      } | null;
    },
    enabled: !!userId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", userId, startDate],
    queryFn: async () => {
      const result = await api.api.profile.stats.get({
        query: { startDate },
      });
      if (result.error) return null;
      return result.data as { daysLogged: number } | null;
    },
    enabled: !!userId,
  });

  const calories = Math.round(logData?.totals?.calories ?? 0);
  const protein = Math.round(logData?.totals?.protein ?? 0);
  const targetCalories = profileData?.profile?.targetCalories ?? 2000;
  const targetProtein = profileData?.profile?.targetProtein ?? 150;
  const activeGoalsCount = goalsData?.goals?.length ?? 0;
  const daysLogged = statsData?.daysLogged ?? 0;

  const isLoading =
    logLoading || goalsLoading || profileLoading || statsLoading;

  const metrics: DashboardMetric[] = [
    settings?.showCaloriesOnDashboard !== false
      ? {
          key: "calories",
          title: "Calories",
          description: "Consumed today",
          value: `${calories} / ${targetCalories}`,
          icon: Flame,
        }
      : null,
    settings?.showProteinOnDashboard !== false
      ? {
          key: "protein",
          title: "Protein",
          description: "Daily target",
          value: `${protein}g / ${targetProtein}g`,
          icon: Apple,
        }
      : null,
    {
      key: "goals",
      title: "Active goals",
      description: "In progress",
      value: `${activeGoalsCount}`,
      icon: Target,
    },
    settings?.showStreakOnDashboard !== false
      ? {
          key: "streak",
          title: "Logging streak",
          description: dashboardRangeLabels[dashboardRange],
          value: `${daysLogged} days`,
          icon: Calendar,
        }
      : null,
  ].filter((metric): metric is DashboardMetric => metric !== null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Quick access to progress, targets, and the next actions that keep your nutrition plan moving."
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
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Chat with your nutrition assistant to log meals, ask questions,
              and stay on plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/assistant">
              <Button className="w-full rounded-xl">Start Chatting</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Food Log
            </CardTitle>
            <CardDescription>
              Review meals, macros, and daily totals without leaving the main
              flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/log">
              <Button variant="outline" className="w-full rounded-xl">
                View Log
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </CardTitle>
            <CardDescription>
              Build weekly structure and keep your active plan close at hand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plans">
              <Button variant="outline" className="w-full rounded-xl">
                View Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
