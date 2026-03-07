"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type GoalStatus } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<GoalStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function GoalsPage() {
  const userId = "demo-user";

  const { data, isLoading } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: { userId },
      });
      if (result.error) throw new Error("Failed to fetch goals");
      return result.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goals</h2>
          <p className="text-muted-foreground">
            Track your nutrition and fitness goals
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data?.goals?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No goals yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Set your first goal to start tracking your progress
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.goals.map((goal) => {
            const progress = (goal.currentValue / goal.targetValue) * 100;
            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">
                      {goal.type.replace(/_/g, " ").toLowerCase()}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={statusColors[goal.status as GoalStatus]}
                    >
                      {goal.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Started {format(new Date(goal.startDate), "MMM d, yyyy")}
                    {goal.endDate &&
                      ` - Ends ${format(new Date(goal.endDate), "MMM d, yyyy")}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} />
                    <p className="text-xs text-muted-foreground">
                      {progress.toFixed(1)}% complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
