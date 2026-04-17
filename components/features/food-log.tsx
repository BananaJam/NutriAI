"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddFoodLogDialog } from "@/components/features/add-food-log-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type MealType, type NutritionTotals } from "@/lib/api";
import { useSessionUser } from "@/lib/use-session-user";

const mealTypeColors: Record<MealType, string> = {
  BREAKFAST: "bg-yellow-100 text-yellow-800",
  LUNCH: "bg-green-100 text-green-800",
  DINNER: "bg-blue-100 text-blue-800",
  SNACK: "bg-purple-100 text-purple-800",
};

const mealTypeLabels: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

interface FoodLogItem {
  id: string;
  mealType: string;
  servings: number;
  food: {
    name: string;
    brand: string | null;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface FoodLogResponse {
  log: {
    items: FoodLogItem[];
  };
  totals: NutritionTotals;
}

export function FoodLog() {
  const { userId } = useSessionUser();
  const [date, setDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const dateStr = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["foodLog", userId, dateStr],
    queryFn: async (): Promise<FoodLogResponse | null> => {
      const result = await api.api["food-logs"]({ date: dateStr }).get();
      if (result.error) return null;
      return result.data as FoodLogResponse;
    },
    enabled: !!userId,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile.get();
      if (result.error) return null;
      return result.data as {
        profile: {
          targetCalories: number | null;
          targetProtein: number | null;
          targetCarbs: number | null;
          targetFat: number | null;
        };
      } | null;
    },
    enabled: !!userId,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({
      foodId,
      mealType,
      servings,
      notes,
    }: {
      foodId: string;
      mealType: MealType;
      servings: number;
      notes?: string;
    }) => {
      const result = await api.api["food-logs"]({ date: dateStr }).items.post({
        foodId,
        mealType,
        servings,
        notes,
      });
      if (result.error) throw new Error("Failed to add food");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodLog", userId, dateStr] });
      toast.success("Food added to log");
    },
    onError: () => {
      toast.error("Failed to add food");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const result = await api.api["food-logs"].items({ itemId }).delete();
      if (result.error) throw new Error("Failed to delete item");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodLog", userId, dateStr] });
      toast.success("Food removed from log");
    },
    onError: () => {
      toast.error("Failed to remove food");
    },
  });

  const goToPreviousDay = () => {
    setDate((prev) => new Date(prev.getTime() - 24 * 60 * 60 * 1000));
  };

  const goToNextDay = () => {
    setDate((prev) => new Date(prev.getTime() + 24 * 60 * 60 * 1000));
  };

  const totals: NutritionTotals = data?.totals || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const activeTargets = {
    calories: profileData?.profile?.targetCalories ?? 2000,
    protein: profileData?.profile?.targetProtein ?? 150,
    carbs: profileData?.profile?.targetCarbs ?? 250,
    fat: profileData?.profile?.targetFat ?? 65,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            disabled={dateStr === format(new Date(), "yyyy-MM-dd")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Food
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totals.calories)}
            </div>
            <Progress
              value={(totals.calories / activeTargets.calories) * 100}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              of {activeTargets.calories} kcal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Protein
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totals.protein)}g
            </div>
            <Progress
              value={(totals.protein / activeTargets.protein) * 100}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              of {activeTargets.protein}g
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Carbs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totals.carbs)}g
            </div>
            <Progress
              value={(totals.carbs / activeTargets.carbs) * 100}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              of {activeTargets.carbs}g
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totals.fat)}g</div>
            <Progress
              value={(totals.fat / activeTargets.fat) * 100}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              of {activeTargets.fat}g
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Food Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error || !data?.log?.items?.length ? (
            <div className="flex flex-col items-center py-8 text-center">
              <UtensilsCrossed className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No food logged for this day
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the &quot;Add Food&quot; button to log your meals
              </p>
              <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Food
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.log.items.map((item: FoodLogItem) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={mealTypeColors[item.mealType as MealType]}
                    >
                      {mealTypeLabels[item.mealType as MealType]}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.food.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.servings} x {item.food.servingSize}
                        {item.food.servingUnit}
                        {item.food.brand && ` - ${item.food.brand}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {Math.round(item.food.calories * item.servings)} kcal
                      </p>
                      <p className="text-muted-foreground">
                        P: {Math.round(item.food.protein * item.servings)}g | C:{" "}
                        {Math.round(item.food.carbs * item.servings)}g | F:{" "}
                        {Math.round(item.food.fat * item.servings)}g
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      disabled={deleteItemMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddFoodLogDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={async (foodId, values) => {
          await addItemMutation.mutateAsync({
            foodId,
            mealType: values.mealType as MealType,
            servings: values.servings,
            notes: values.notes,
          });
        }}
        isSubmitting={addItemMutation.isPending}
      />
    </div>
  );
}
