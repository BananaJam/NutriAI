"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  UtensilsCrossed,
  Calendar,
  Target,
  TrendingUp,
  Apple,
} from "lucide-react";

const userId = "demo-user";
const todayStr = format(new Date(), "yyyy-MM-dd");
const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

export default function DashboardPage() {
  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["foodLog", userId, todayStr],
    queryFn: async () => {
      const result = await api.api["food-logs"]({ date: todayStr }).get({
        query: { userId },
      });
      if (result.error) return null;
      return result.data as { totals: { calories: number; protein: number; carbs: number; fat: number } } | null;
    },
  });

  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: { userId, status: "ACTIVE" },
      });
      if (result.error) return null;
      return result.data;
    },
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile({ userId }).get();
      if (result.error) return null;
      return result.data as { profile: { targetCalories: number | null; targetProtein: number | null } } | null;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", userId],
    queryFn: async () => {
      const result = await api.api.profile({ userId }).stats.get({
        query: { startDate: thirtyDaysAgo },
      });
      if (result.error) return null;
      return result.data as { daysLogged: number } | null;
    },
  });

  const calories = Math.round(logData?.totals?.calories ?? 0);
  const protein = Math.round(logData?.totals?.protein ?? 0);
  const targetCalories = profileData?.profile?.targetCalories ?? 2000;
  const targetProtein = profileData?.profile?.targetProtein ?? 150;
  const activeGoalsCount = goalsData?.goals?.length ?? 0;
  const daysLogged = statsData?.daysLogged ?? 0;

  const isLoading = logLoading || goalsLoading || profileLoading || statsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your nutrition tracking dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Calories
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {calories} / {targetCalories}
                </div>
                <p className="text-xs text-muted-foreground">kcal consumed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {protein}g / {targetProtein}g
                </div>
                <p className="text-xs text-muted-foreground">daily target</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeGoalsCount}</div>
                <p className="text-xs text-muted-foreground">goals in progress</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{daysLogged} days</div>
                <p className="text-xs text-muted-foreground">logged in last 30 days</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Chat with your personal nutrition AI to log meals, get
              recommendations, and track your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/assistant">
              <Button className="w-full">Start Chatting</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Food Log
            </CardTitle>
            <CardDescription>
              View and manage your daily food intake with detailed nutrition
              information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/log">
              <Button variant="outline" className="w-full">
                View Log
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </CardTitle>
            <CardDescription>
              Create and manage weekly meal plans to stay on track with your
              nutrition goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plans">
              <Button variant="outline" className="w-full">
                View Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
