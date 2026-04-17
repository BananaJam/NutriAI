"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddFoodLogDialog } from "@/components/features/add-food-log-dialog";
import {
  EditFoodLogItemDialog,
  type EditFoodLogItemValues,
} from "@/components/features/edit-food-log-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type FoodLogItem,
  type FoodLogResponse,
  type MealType,
  type NutritionTotals,
} from "@/lib/api";
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

const mealOrder: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export function FoodLog() {
  const { userId } = useSessionUser();
  const [date, setDate] = useState(new Date());
  const [dateInput, setDateInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodLogItem | null>(null);
  const dateStr = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["foodLog", userId, dateStr],
    queryFn: async (): Promise<FoodLogResponse | null> => {
      const result = await api.api["food-logs"]({ date: dateStr }).get();
      if (result.error) return null;
      return result.data as unknown as FoodLogResponse;
    },
    enabled: !!userId,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await api.api.profile.get();
      if (result.error) return null;
      return result.data as unknown as {
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
      queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] });
      toast.success("Food added to log");
    },
    onError: () => {
      toast.error("Failed to add food");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (values: EditFoodLogItemValues) => {
      if (!selectedItem) throw new Error("No item selected");

      const result = await api.api["food-logs"]
        .items({ itemId: selectedItem.id })
        .patch({
          mealType: values.mealType,
          servings: values.servings,
          notes: values.notes || undefined,
        });
      if (result.error) throw new Error("Failed to update food");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodLog", userId, dateStr] });
      toast.success("Log item updated");
      setIsEditOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast.error("Failed to update log item");
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
      queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] });
      toast.success("Food removed from log");
    },
    onError: () => {
      toast.error("Failed to remove food");
    },
  });

  const goToPreviousDay = () => {
    const nextDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    setDate(nextDate);
    setDateInput(format(nextDate, "yyyy-MM-dd"));
  };

  const goToNextDay = () => {
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    setDate(nextDate);
    setDateInput(format(nextDate, "yyyy-MM-dd"));
  };

  const handleDateCommit = () => {
    if (!dateInput) return;
    setDate(new Date(dateInput));
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

  const groupedItems = useMemo(() => {
    const items = data?.log?.items ?? [];

    return mealOrder.map((mealType) => ({
      mealType,
      items: items.filter((item) => item.mealType === mealType),
    }));
  }, [data?.log?.items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            onBlur={handleDateCommit}
            className="w-[180px]"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            disabled={dateStr === format(new Date(), "yyyy-MM-dd")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">
            {format(date, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Food
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MacroCard
          title="Calories"
          value={Math.round(totals.calories)}
          suffix=""
          target={activeTargets.calories}
        />
        <MacroCard
          title="Protein"
          value={Math.round(totals.protein)}
          suffix="g"
          target={activeTargets.protein}
        />
        <MacroCard
          title="Carbs"
          value={Math.round(totals.carbs)}
          suffix="g"
          target={activeTargets.carbs}
        />
        <MacroCard
          title="Fat"
          value={Math.round(totals.fat)}
          suffix="g"
          target={activeTargets.fat}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Food items</CardTitle>
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
                Use the add flow or quick recent foods to build the day faster.
              </p>
              <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Food
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedItems.map((group) =>
                group.items.length ? (
                  <div key={group.mealType} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={mealTypeColors[group.mealType]}
                      >
                        {mealTypeLabels[group.mealType]}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {group.items.length} item
                        {group.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{item.food.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.servings} x {item.food.servingSize}
                              {item.food.servingUnit}
                              {item.food.brand && ` · ${item.food.brand}`}
                              {item.notes ? ` · ${item.notes}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <p className="font-medium">
                              {Math.round(item.food.calories * item.servings)}{" "}
                              kcal
                            </p>
                            <p className="text-muted-foreground">
                              P: {Math.round(item.food.protein * item.servings)}
                              g | C:{" "}
                              {Math.round(item.food.carbs * item.servings)}g |
                              F: {Math.round(item.food.fat * item.servings)}g
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddFoodLogDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={async (foodId, values) => {
          await addItemMutation.mutateAsync({ foodId, ...values });
        }}
        isSubmitting={addItemMutation.isPending}
      />

      <EditFoodLogItemDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        item={selectedItem}
        onSubmit={async (values) => {
          await updateItemMutation.mutateAsync(values);
        }}
        isSubmitting={updateItemMutation.isPending}
      />
    </div>
  );
}

function MacroCard({
  title,
  value,
  suffix,
  target,
}: {
  title: string;
  value: number;
  suffix: string;
  target: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {suffix}
        </div>
        <Progress value={(value / target) * 100} className="mt-2" />
        <p className="mt-1 text-xs text-muted-foreground">
          of {target}
          {suffix}
          {suffix ? "" : " kcal"}
        </p>
      </CardContent>
    </Card>
  );
}
