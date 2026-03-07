"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus } from "lucide-react";
import { format } from "date-fns";

export default function MealPlansPage() {
  const userId = "demo-user";

  const { data, isLoading } = useQuery({
    queryKey: ["mealPlans", userId],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get({
        query: { userId },
      });
      if (result.error) throw new Error("Failed to fetch meal plans");
      return result.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meal Plans</h2>
          <p className="text-muted-foreground">
            Create and manage your weekly meal plans
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
      ) : !data?.plans?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No meal plans yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Create your first meal plan to start organizing your weekly meals
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Meal Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  {format(new Date(plan.startDate), "MMM d")} -{" "}
                  {format(new Date(plan.endDate), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {plan.items?.length || 0} meals planned
                </p>
                <Button variant="outline" className="mt-4 w-full">
                  View Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
