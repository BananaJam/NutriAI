"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddMealPlanItemDialog } from "@/components/features/add-meal-plan-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MealPlan, MealPlanItem, MealType } from "@/lib/api";
import { api } from "@/lib/api";

interface MealPlanDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MealPlan | null;
  onPlanDeleted?: () => void;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullDayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const mealTypeColors: Record<MealType, string> = {
  BREAKFAST: "bg-yellow-100 text-yellow-800",
  LUNCH: "bg-green-100 text-green-800",
  DINNER: "bg-blue-100 text-blue-800",
  SNACK: "bg-purple-100 text-purple-800",
};

const mealOrder: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export function MealPlanDetailDialog({
  open,
  onOpenChange,
  plan,
  onPlanDeleted: _onPlanDeleted,
}: MealPlanDetailDialogProps) {
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [applyDate, setApplyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mealPlan", plan?.id],
    queryFn: async () => {
      if (!plan?.id) return null;
      const result = await api.api["meal-plans"]({ id: plan.id }).get();
      if (result.error) return null;
      return result.data as unknown as {
        plan: MealPlan & { items: MealPlanItem[] };
      } | null;
    },
    enabled: open && !!plan?.id,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({
      foodId,
      dayOfWeek,
      mealType,
      servings,
      notes,
    }: {
      foodId: string;
      dayOfWeek: number;
      mealType: MealType;
      servings: number;
      notes?: string;
    }) => {
      if (!plan?.id) throw new Error("No plan selected");
      const result = await api.api["meal-plans"]({ id: plan.id }).items.post({
        foodId,
        dayOfWeek,
        mealType,
        servings,
        notes,
      });
      if (result.error) throw new Error("Failed to add item");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan", plan?.id] });
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast.success("Item added to plan");
    },
    onError: () => {
      toast.error("Failed to add item");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const result = await api.api["meal-plans"].items({ itemId }).delete();
      if (result.error) throw new Error("Failed to delete item");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan", plan?.id] });
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast.success("Item removed from plan");
    },
    onError: () => {
      toast.error("Failed to remove item");
    },
  });

  const applyPlanMutation = useMutation({
    mutationFn: async ({
      dayOfWeek,
      mealType,
    }: {
      dayOfWeek: number;
      mealType?: MealType;
    }) => {
      if (!plan?.id) throw new Error("No plan selected");

      const result = await api.api["meal-plans"]({ id: plan.id }).apply.post({
        date: applyDate,
        dayOfWeek,
        mealType,
      });
      if (result.error) throw new Error("Failed to apply meal plan");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["foodLog"] });
      queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] });
      toast.success(`${data.appliedCount} item(s) added to the food log`);
    },
    onError: () => {
      toast.error("Failed to apply meal plan");
    },
  });

  const planData = data?.plan;
  const items = planData?.items ?? [];

  const itemsByDay = dayNames.reduce(
    (acc, _, dayIndex) => {
      acc[dayIndex] = items.filter((item) => item.dayOfWeek === dayIndex);
      return acc;
    },
    {} as Record<number, MealPlanItem[]>,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between pr-6">
              <div>
                <DialogTitle className="text-xl">
                  {plan?.name ?? "Meal Plan"}
                </DialogTitle>
                {plan && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(new Date(plan.startDate), "MMM d")} -{" "}
                    {format(new Date(plan.endDate), "MMM d, yyyy")}
                    {" · "}
                    <Badge
                      variant={plan.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={applyDate}
                  onChange={(event) => setApplyDate(event.target.value)}
                  className="w-[170px]"
                />
                <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="1">
              <TabsList className="flex w-full">
                {dayNames.map((day, i) => (
                  <TabsTrigger
                    key={day}
                    value={String(i)}
                    className="flex-1 text-xs px-1"
                  >
                    {day}
                  </TabsTrigger>
                ))}
              </TabsList>

              {dayNames.map((_, dayIndex) => {
                const dayItems = itemsByDay[dayIndex] ?? [];
                const dayKey = fullDayNames[dayIndex];
                const groupedByMeal = mealOrder.reduce(
                  (acc, mealType) => {
                    acc[mealType] = dayItems.filter(
                      (item) => item.mealType === mealType,
                    );
                    return acc;
                  },
                  {} as Record<MealType, MealPlanItem[]>,
                );

                return (
                  <TabsContent
                    key={dayKey}
                    value={String(dayIndex)}
                    className="space-y-4 mt-4"
                  >
                    <h3 className="font-semibold text-sm">
                      {fullDayNames[dayIndex]}
                    </h3>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyPlanMutation.mutate({ dayOfWeek: dayIndex })
                        }
                        disabled={applyPlanMutation.isPending}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Apply full day to {applyDate}
                      </Button>
                    </div>
                    {dayItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No meals planned for {fullDayNames[dayIndex]}
                      </p>
                    ) : (
                      mealOrder.map((mealType) => {
                        const mealItems = groupedByMeal[mealType];
                        if (!mealItems.length) return null;
                        return (
                          <div key={mealType} className="space-y-2">
                            <Badge
                              variant="secondary"
                              className={mealTypeColors[mealType]}
                            >
                              {mealType.charAt(0) +
                                mealType.slice(1).toLowerCase()}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                applyPlanMutation.mutate({
                                  dayOfWeek: dayIndex,
                                  mealType,
                                })
                              }
                              disabled={applyPlanMutation.isPending}
                            >
                              Apply meal
                            </Button>
                            {mealItems.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center justify-between rounded-lg border p-3"
                              >
                                <div>
                                  <p className="font-medium text-sm">
                                    {item.food.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.servings} x {item.food.servingSize}
                                    {item.food.servingUnit}
                                    {" · "}
                                    {Math.round(
                                      item.food.calories * item.servings,
                                    )}{" "}
                                    kcal
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    deleteItemMutation.mutate(item.id)
                                  }
                                  disabled={deleteItemMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AddMealPlanItemDialog
        open={isAddItemOpen}
        onOpenChange={setIsAddItemOpen}
        onSubmit={async (foodId, values) => {
          await addItemMutation.mutateAsync({
            foodId,
            dayOfWeek: values.dayOfWeek,
            mealType: values.mealType as MealType,
            servings: values.servings,
            notes: values.notes,
          });
        }}
        isSubmitting={addItemMutation.isPending}
      />
    </>
  );
}
