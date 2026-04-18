"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddFoodLogDialog } from "@/components/features/add-food-log-dialog";
import {
  EditFoodLogItemDialog,
  type EditFoodLogItemValues,
} from "@/components/features/edit-food-log-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type FoodLogItem,
  type FoodLogResponse,
  type MealPlan,
  type MealPlanItem,
  type MealType,
  type NutritionTotals,
  normalizeFoodLogResponse,
  normalizeMealPlansResponse,
  normalizeProfileResponse,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const rangeParam = searchParams.get("range");
  const fromProgress = searchParams.get("from") === "progress";
  const [date, setDate] = useState(() => parseDateParam(dateParam));
  const [dateInput, setDateInput] = useState(() =>
    format(parseDateParam(dateParam), "yyyy-MM-dd"),
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodLogItem | null>(null);
  const dateStr = format(date, "yyyy-MM-dd");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["foodLog", userId, dateStr],
    queryFn: async (): Promise<FoodLogResponse | null> => {
      const result = await api.api["food-logs"]({ date: dateStr }).get();
      if (result.error || !("log" in result.data)) return null;
      return normalizeFoodLogResponse(result.data);
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

  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["mealPlans", "active", userId],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get({
        query: { active: true },
      });
      if (result.error || !("plans" in result.data)) return null;
      return normalizeMealPlansResponse(result.data);
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

  const applyMealPlanMutation = useMutation({
    mutationFn: async ({
      planId,
      mealType,
    }: {
      planId: string;
      mealType?: MealType;
    }) => {
      const result = await api.api["meal-plans"]({ id: planId }).apply.post({
        date: dateStr,
        dayOfWeek: date.getDay(),
        mealType,
      });
      if (result.error) throw new Error("Failed to apply meal plan");
      return result.data;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["foodLog", userId, dateStr],
        }),
        queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      toast.success(`${result.appliedCount} planned item(s) added to the log`);
    },
    onError: () => {
      toast.error("Failed to apply planned meals");
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
    updateDate(nextDate);
  };

  const goToNextDay = () => {
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    updateDate(nextDate);
  };

  const handleDateCommit = () => {
    if (!dateInput) return;
    updateDate(new Date(dateInput));
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

  const activePlan = mealPlansData?.plans[0] ?? null;
  const plannedDayItems = useMemo(() => {
    if (!activePlan) return [];
    return activePlan.items.filter((item) => item.dayOfWeek === date.getDay());
  }, [activePlan, date]);
  const plannedItemsByMeal = useMemo(
    () =>
      mealOrder.map((mealType) => ({
        mealType,
        items: plannedDayItems.filter((item) => item.mealType === mealType),
      })),
    [plannedDayItems],
  );
  const plannedTotals = useMemo(
    () =>
      plannedDayItems.reduce(
        (acc, item) => {
          acc.calories += item.food.calories * item.servings;
          acc.protein += item.food.protein * item.servings;
          acc.itemCount += 1;
          return acc;
        },
        { calories: 0, protein: 0, itemCount: 0 },
      ),
    [plannedDayItems],
  );

  useEffect(() => {
    const nextDate = parseDateParam(dateParam);
    setDate(nextDate);
    setDateInput(format(nextDate, "yyyy-MM-dd"));
  }, [dateParam]);

  const updateDate = (nextDate: Date) => {
    const nextDateKey = format(nextDate, "yyyy-MM-dd");
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("date", nextDateKey);

    setDate(nextDate);
    setDateInput(nextDateKey);
    router.replace(`/log?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      {fromProgress ? (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={rangeParam ? `/progress?range=${rangeParam}` : "/progress"}
            className="inline-flex items-center text-sm font-medium text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to progress
          </Link>
        </div>
      ) : null}

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

      <MealPlanBridgeCard
        date={date}
        dateStr={dateStr}
        activePlan={activePlan}
        isLoading={mealPlansLoading}
        plannedItemsByMeal={plannedItemsByMeal}
        plannedTotals={plannedTotals}
        onApplyFullDay={() =>
          activePlan
            ? applyMealPlanMutation.mutate({ planId: activePlan.id })
            : undefined
        }
        onApplyMeal={(mealType) =>
          activePlan
            ? applyMealPlanMutation.mutate({ planId: activePlan.id, mealType })
            : undefined
        }
        isApplying={applyMealPlanMutation.isPending}
      />

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

function parseDateParam(value: string | null) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function MealPlanBridgeCard({
  date,
  dateStr,
  activePlan,
  isLoading,
  plannedItemsByMeal,
  plannedTotals,
  onApplyFullDay,
  onApplyMeal,
  isApplying,
}: {
  date: Date;
  dateStr: string;
  activePlan: MealPlan | null;
  isLoading: boolean;
  plannedItemsByMeal: Array<{ mealType: MealType; items: MealPlanItem[] }>;
  plannedTotals: {
    calories: number;
    protein: number;
    itemCount: number;
  };
  onApplyFullDay: () => void;
  onApplyMeal: (mealType: MealType) => void;
  isApplying: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-56 rounded-xl" />;
  }

  if (!activePlan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Connect planning to logging
          </CardTitle>
          <CardDescription>
            There is no active meal plan yet, so this day is being built
            manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Create an active plan to bring planned meals into your daily log in
            one step.
          </p>
          <Button asChild variant="outline">
            <Link href="/plans">Open meal plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-background/80">
              Active plan
            </Badge>
            <Badge variant="outline">{format(date, "EEEE")}</Badge>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Planned meals for {format(date, "MMMM d")}
            </CardTitle>
            <CardDescription>
              Pull meals from{" "}
              <span className="font-medium">{activePlan.name}</span> into this
              day&apos;s log without leaving the page.
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="bg-background/90"
          >
            <Link href="/plans">Review plan</Link>
          </Button>
          <Button
            size="sm"
            onClick={onApplyFullDay}
            disabled={isApplying || plannedTotals.itemCount === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Apply full day
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {plannedTotals.itemCount === 0 ? (
          <div className="rounded-lg border border-dashed bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            Nothing is planned for {format(date, "EEEE")} in the active plan.
            Use the planner to add meals, then come back here to apply them to{" "}
            {dateStr}.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <PlanStat
                label="Planned items"
                value={`${plannedTotals.itemCount}`}
              />
              <PlanStat
                label="Planned calories"
                value={`${Math.round(plannedTotals.calories)} kcal`}
              />
              <PlanStat
                label="Planned protein"
                value={`${Math.round(plannedTotals.protein)}g`}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {plannedItemsByMeal.map((group) =>
                group.items.length ? (
                  <div
                    key={group.mealType}
                    className="rounded-lg border bg-background/85 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant="secondary"
                        className={mealTypeColors[group.mealType]}
                      >
                        {mealTypeLabels[group.mealType]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => onApplyMeal(group.mealType)}
                        disabled={isApplying}
                      >
                        Apply meal
                      </Button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{item.food.name}</p>
                            <p className="text-muted-foreground">
                              {item.servings} x {item.food.servingSize}
                              {item.food.servingUnit}
                              {item.food.brand ? ` · ${item.food.brand}` : ""}
                              {item.notes ? ` · ${item.notes}` : ""}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-muted-foreground">
                            {Math.round(item.food.calories * item.servings)}{" "}
                            kcal
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/85 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
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
