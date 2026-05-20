"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  Copy,
  Pencil,
  Plus,
  ShoppingBasket,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddMealPlanItemDialog } from "@/components/features/add-meal-plan-item-dialog";
import { DeleteMealPlanDialog } from "@/components/features/delete-meal-plan-dialog";
import {
  DuplicateMealPlanDayDialog,
  type DuplicateMealPlanDayValues,
} from "@/components/features/duplicate-meal-plan-day-dialog";
import {
  EditMealPlanItemDialog,
  type EditMealPlanItemValues,
} from "@/components/features/edit-meal-plan-item-dialog";
import {
  MealPlanFormDialog,
  type MealPlanFormValues,
} from "@/components/features/meal-plan-form-dialog";
import { PageHeader } from "@/components/features/page-header";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  type MealPlan,
  type MealPlanItem,
  type MealPlanShoppingList,
  type MealType,
  normalizeMealPlanResponse,
  normalizeMealPlanShoppingListResponse,
  normalizeMealPlansResponse,
} from "@/lib/api";
import { useSessionUser } from "@/lib/use-session-user";

const mealOrder: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const mealLabels: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function MealPlansPage() {
  const { userId } = useSessionUser();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [applyDate, setApplyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [addItemState, setAddItemState] = useState<{
    open: boolean;
    dayOfWeek: number;
    mealType: MealType;
  }>({
    open: false,
    dayOfWeek: 1,
    mealType: "BREAKFAST",
  });
  const [editingItem, setEditingItem] = useState<MealPlanItem | null>(null);
  const [duplicateDay, setDuplicateDay] = useState<number | null>(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState("1");

  const mealPlansQuery = useQuery({
    queryKey: ["mealPlans"],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get();
      if (result.error || !("plans" in result.data)) {
        throw new Error("Failed to fetch meal plans");
      }
      return normalizeMealPlansResponse(result.data);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    const plans = mealPlansQuery.data?.plans ?? [];
    if (!plans.length) {
      setSelectedPlanId(null);
      return;
    }

    if (selectedPlanId && plans.some((plan) => plan.id === selectedPlanId)) {
      return;
    }

    setSelectedPlanId(
      plans.find((plan) => plan.isActive)?.id ?? plans[0]?.id ?? null,
    );
  }, [mealPlansQuery.data?.plans, selectedPlanId]);

  const selectedPlan = useMemo(
    () =>
      mealPlansQuery.data?.plans.find((plan) => plan.id === selectedPlanId) ??
      null,
    [mealPlansQuery.data?.plans, selectedPlanId],
  );

  const planDetailQuery = useQuery({
    queryKey: ["mealPlan", selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return null;
      const result = await api.api["meal-plans"]({ id: selectedPlanId }).get();
      if (result.error || !("plan" in result.data) || !result.data.plan) {
        throw new Error("Failed to fetch meal plan");
      }
      return normalizeMealPlanResponse(result.data);
    },
    enabled: !!selectedPlanId,
  });

  const shoppingListQuery = useQuery({
    queryKey: ["mealPlanShoppingList", selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return null;
      const result = await api.api["meal-plans"]({
        id: selectedPlanId,
      })["shopping-list"].get();
      if (
        result.error ||
        !("shoppingList" in result.data) ||
        !result.data.shoppingList
      ) {
        throw new Error("Failed to fetch shopping list");
      }
      return normalizeMealPlanShoppingListResponse(result.data);
    },
    enabled: !!selectedPlanId,
  });

  const invalidatePlannerData = async (planId = selectedPlanId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] }),
      planId
        ? queryClient.invalidateQueries({ queryKey: ["mealPlan", planId] })
        : Promise.resolve(),
      planId
        ? queryClient.invalidateQueries({
            queryKey: ["mealPlanShoppingList", planId],
          })
        : Promise.resolve(),
    ]);
  };

  const createPlanMutation = useMutation({
    mutationFn: async (values: MealPlanFormValues) => {
      const result = await api.api["meal-plans"].post({
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        isActive: values.isActive,
      });
      if (result.error || !("plan" in result.data) || !result.data.plan) {
        throw new Error("Failed to create meal plan");
      }
      return result.data.plan;
    },
    onSuccess: async (plan) => {
      await invalidatePlannerData(plan.id);
      setSelectedPlanId(plan.id);
      setIsFormOpen(false);
      setEditingPlan(null);
      toast.success("Meal plan created");
    },
    onError: () => {
      toast.error("Failed to create meal plan");
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: MealPlanFormValues;
    }) => {
      const result = await api.api["meal-plans"]({ id }).put({
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        isActive: values.isActive,
      });
      if (result.error || !("plan" in result.data) || !result.data.plan) {
        throw new Error("Failed to update meal plan");
      }
      return result.data.plan;
    },
    onSuccess: async (plan) => {
      await invalidatePlannerData(plan.id);
      setEditingPlan(null);
      setIsFormOpen(false);
      toast.success("Meal plan updated");
    },
    onError: () => {
      toast.error("Failed to update meal plan");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api["meal-plans"]({ id }).delete();
      if (result.error) throw new Error("Failed to delete meal plan");
      return id;
    },
    onSuccess: async (deletedId) => {
      await invalidatePlannerData(deletedId);
      setIsDeleteOpen(false);
      setSelectedPlanId((current) => (current === deletedId ? null : current));
      toast.success("Meal plan deleted");
    },
    onError: () => {
      toast.error("Failed to delete meal plan");
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({
      planId,
      foodId,
      dayOfWeek,
      mealType,
      servings,
      notes,
    }: {
      planId: string;
      foodId: string;
      dayOfWeek: number;
      mealType: MealType;
      servings: number;
      notes?: string;
    }) => {
      const result = await api.api["meal-plans"]({ id: planId }).items.post({
        foodId,
        dayOfWeek,
        mealType,
        servings,
        notes,
      });
      if (result.error) throw new Error("Failed to add item");
      return result.data;
    },
    onSuccess: async () => {
      await invalidatePlannerData();
      setAddItemState((current) => ({ ...current, open: false }));
      toast.success("Meal added to plan");
    },
    onError: () => {
      toast.error("Failed to add meal");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      values,
    }: {
      itemId: string;
      values: EditMealPlanItemValues;
    }) => {
      const result = await api.api["meal-plans"].items({ itemId }).patch({
        dayOfWeek: values.dayOfWeek,
        mealType: values.mealType,
        servings: values.servings,
        notes: values.notes,
      });
      if (result.error) throw new Error("Failed to update meal item");
      return result.data;
    },
    onSuccess: async () => {
      await invalidatePlannerData();
      setEditingItem(null);
      toast.success("Meal item updated");
    },
    onError: () => {
      toast.error("Failed to update meal item");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const result = await api.api["meal-plans"].items({ itemId }).delete();
      if (result.error) throw new Error("Failed to delete item");
      return result.data;
    },
    onSuccess: async () => {
      await invalidatePlannerData();
      toast.success("Meal item removed");
    },
    onError: () => {
      toast.error("Failed to remove meal item");
    },
  });

  const duplicateDayMutation = useMutation({
    mutationFn: async ({
      planId,
      values,
    }: {
      planId: string;
      values: DuplicateMealPlanDayValues;
    }) => {
      const result = await api.api["meal-plans"]({
        id: planId,
      })["duplicate-week"].post(values);
      if (result.error) throw new Error("Failed to duplicate day");
      return result.data;
    },
    onSuccess: async (data) => {
      await invalidatePlannerData();
      setDuplicateDay(null);
      toast.success(`${data.duplicatedCount} meal(s) copied to the target day`);
    },
    onError: () => {
      toast.error("Failed to duplicate day");
    },
  });

  const applyPlanMutation = useMutation({
    mutationFn: async ({
      planId,
      dayOfWeek,
      mealType,
    }: {
      planId: string;
      dayOfWeek: number;
      mealType?: MealType;
    }) => {
      const result = await api.api["meal-plans"]({ id: planId }).apply.post({
        date: applyDate,
        dayOfWeek,
        mealType,
      });
      if (result.error) throw new Error("Failed to apply meal plan");
      return result.data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["foodLog"] }),
        queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      toast.success(`${data.appliedCount} item(s) added to the food log`);
    },
    onError: () => {
      toast.error("Failed to apply meal plan");
    },
  });

  const planData = planDetailQuery.data?.plan ?? selectedPlan;
  const shoppingList = shoppingListQuery.data?.shoppingList ?? null;
  const planItems = planData?.items ?? [];

  const itemsByDayAndMeal = useMemo(() => {
    return dayNames.reduce(
      (dayAcc, _dayName, dayIndex) => {
        dayAcc[dayIndex] = mealOrder.reduce(
          (mealAcc, mealType) => {
            mealAcc[mealType] = planItems.filter(
              (item) =>
                item.dayOfWeek === dayIndex && item.mealType === mealType,
            );
            return mealAcc;
          },
          {} as Record<MealType, MealPlanItem[]>,
        );
        return dayAcc;
      },
      {} as Record<number, Record<MealType, MealPlanItem[]>>,
    );
  }, [planItems]);

  const planStats = useMemo(() => {
    return planItems.reduce(
      (acc, item) => {
        acc.totalMeals += 1;
        acc.calories += item.food.calories * item.servings;
        acc.protein += item.food.protein * item.servings;
        return acc;
      },
      { totalMeals: 0, calories: 0, protein: 0 },
    );
  }, [planItems]);

  const dayStats = useMemo(() => {
    return dayNames.map((_dayName, dayOfWeek) => {
      const dayItems = mealOrder.flatMap(
        (mealType) => itemsByDayAndMeal[dayOfWeek]?.[mealType] ?? [],
      );

      return {
        mealCount: dayItems.length,
        calories: dayItems.reduce(
          (total, item) => total + item.food.calories * item.servings,
          0,
        ),
      };
    });
  }, [itemsByDayAndMeal]);

  const shoppingListText = useMemo(
    () => buildShoppingListText(shoppingList),
    [shoppingList],
  );

  const isPlanMutating =
    createPlanMutation.isPending ||
    updatePlanMutation.isPending ||
    deletePlanMutation.isPending;

  const openCreatePlan = () => {
    setEditingPlan(null);
    setIsFormOpen(true);
  };

  const openEditPlan = () => {
    if (!planData) return;
    setEditingPlan(planData);
    setIsFormOpen(true);
  };

  const copyShoppingList = async () => {
    if (!shoppingListText) return;

    try {
      await navigator.clipboard.writeText(shoppingListText);
      toast.success("Shopping list copied");
    } catch {
      toast.error("Failed to copy shopping list");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Weekly workflow"
        title="Meal Plans"
        description="Build a weekly plan, apply meals to your log, and keep a shopping list in sync with what you planned."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {planData ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={openEditPlan}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit plan
              </Button>
            ) : null}
            <Button className="rounded-xl" onClick={openCreatePlan}>
              <Plus className="mr-2 h-4 w-4" />
              New plan
            </Button>
          </div>
        }
      />

      {mealPlansQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : !mealPlansQuery.data?.plans.length ? (
        <Card className="app-surface">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">No meal plans yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Create your first weekly plan to organize meals and generate a
                shopping list from what you scheduled.
              </p>
            </div>
            <Button onClick={openCreatePlan}>
              <Plus className="mr-2 h-4 w-4" />
              Create meal plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="app-surface overflow-hidden">
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:p-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {planData ? (
                      <Badge
                        variant={planData.isActive ? "default" : "secondary"}
                        className="rounded-full px-3 py-1"
                      >
                        {planData.isActive ? "Active plan" : "Inactive plan"}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {planStats.totalMeals} planned meals
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {Math.round(planStats.calories)} kcal scheduled
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {Math.round(planStats.protein)}g protein
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl tracking-tight">
                      {planData?.name ?? "Select a meal plan"}
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-sm leading-6">
                      {planData
                        ? `${format(new Date(planData.startDate), "MMM d")} - ${format(new Date(planData.endDate), "MMM d, yyyy")} · Weekly structure, quick apply actions, and a synced shopping list in one workspace.`
                        : "Choose a plan to open your weekly workspace."}
                    </CardDescription>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatChip
                    label="Planned meals"
                    value={planStats.totalMeals}
                    icon={CalendarDays}
                  />
                  <StatChip
                    label="Scheduled calories"
                    value={`${Math.round(planStats.calories)} kcal`}
                    icon={Sparkles}
                  />
                  <StatChip
                    label="Scheduled protein"
                    value={`${Math.round(planStats.protein)} g`}
                    icon={Target}
                  />
                  <StatChip
                    label="Days covered"
                    value={
                      planData
                        ? `${
                            Math.round(
                              (new Date(planData.endDate).getTime() -
                                new Date(planData.startDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            ) + 1
                          } days`
                        : "0 days"
                    }
                    icon={ShoppingBasket}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-border/70 bg-background/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex h-full flex-col gap-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      Plan controls
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Switch plans, set the target log date, and manage this
                      schedule from one place.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-muted-foreground">
                        Current plan
                      </span>
                      <select
                        className="flex h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm shadow-sm transition outline-none focus:border-primary"
                        value={selectedPlanId ?? ""}
                        onChange={(event) =>
                          setSelectedPlanId(event.target.value)
                        }
                      >
                        {mealPlansQuery.data.plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                            {plan.isActive ? " (Active)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label
                      htmlFor="plan-apply-date"
                      className="space-y-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        Apply to date
                      </span>
                      <Input
                        id="plan-apply-date"
                        type="date"
                        className="h-12 rounded-2xl"
                        value={applyDate}
                        onChange={(event) => setApplyDate(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-3">
                    {planData ? (
                      <Button
                        variant="outline"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={() => setIsDeleteOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete plan
                      </Button>
                    ) : null}
                    <p className="text-xs leading-5 text-muted-foreground">
                      Applying a day or meal writes items into the food log for{" "}
                      {format(new Date(applyDate), "MMM d, yyyy")}.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="planner" className="space-y-4">
            <TabsList className="grid h-12 w-full max-w-md grid-cols-2 rounded-2xl bg-muted/70 p-1">
              <TabsTrigger value="planner">Planner</TabsTrigger>
              <TabsTrigger value="shopping">Shopping list</TabsTrigger>
            </TabsList>

            <TabsContent value="planner" className="space-y-4">
              {planDetailQuery.isLoading ? (
                <Skeleton className="h-[840px] rounded-3xl" />
              ) : (
                <div className="space-y-4">
                  <Card className="app-surface overflow-hidden">
                    <CardHeader className="border-b border-border/70 pb-5">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div className="space-y-1">
                          <CardTitle>Weekly meal calendar</CardTitle>
                          <CardDescription>
                            Plan the week by day and meal slot, then apply a
                            full day or a single meal into the food log.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="rounded-full">
                            7-day calendar
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            Meal rows
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            Mobile day tabs
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="hidden overflow-x-auto lg:block">
                        <div className="grid min-w-[1120px] grid-cols-[116px_repeat(7,minmax(0,1fr))]">
                          <div className="sticky left-0 z-10 border-border/70 border-r border-b bg-card/95 p-4">
                            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                              Meals
                            </p>
                          </div>
                          {dayNames.map((dayName, dayOfWeek) => {
                            const stats = dayStats[dayOfWeek];

                            return (
                              <div
                                key={dayName}
                                className="border-border/70 border-r border-b bg-card/95 p-3 last:border-r-0"
                              >
                                <div className="space-y-2">
                                  <div className="min-w-0">
                                    <h3 className="truncate font-semibold text-sm">
                                      {dayName}
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {stats.mealCount} meals ·{" "}
                                      {Math.round(stats.calories)} kcal
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-xl"
                                      onClick={() => setDuplicateDay(dayOfWeek)}
                                    >
                                      <Copy className="h-4 w-4" />
                                      <span className="sr-only">
                                        Duplicate {dayName}
                                      </span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-xl"
                                      disabled={applyPlanMutation.isPending}
                                      onClick={() =>
                                        planData &&
                                        applyPlanMutation.mutate({
                                          planId: planData.id,
                                          dayOfWeek,
                                        })
                                      }
                                    >
                                      <Sparkles className="h-4 w-4" />
                                      <span className="sr-only">
                                        Apply {dayName}
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {mealOrder.map((mealType) => (
                            <div key={mealType} className="contents">
                              <div className="sticky left-0 z-10 border-border/70 border-r border-b bg-card/95 p-4">
                                <Badge
                                  variant="secondary"
                                  className="rounded-full px-2.5 py-1"
                                >
                                  {mealLabels[mealType]}
                                </Badge>
                              </div>
                              {dayNames.map((dayName, dayOfWeek) => (
                                <MealCalendarCell
                                  key={`${dayName}-${mealType}`}
                                  mealType={mealType}
                                  items={
                                    itemsByDayAndMeal[dayOfWeek]?.[mealType] ??
                                    []
                                  }
                                  planId={planData?.id}
                                  isApplying={applyPlanMutation.isPending}
                                  isDeleting={deleteItemMutation.isPending}
                                  onAdd={() =>
                                    setAddItemState({
                                      open: true,
                                      dayOfWeek,
                                      mealType,
                                    })
                                  }
                                  onApply={() =>
                                    planData &&
                                    applyPlanMutation.mutate({
                                      planId: planData.id,
                                      dayOfWeek,
                                      mealType,
                                    })
                                  }
                                  onEdit={setEditingItem}
                                  onDelete={(itemId) =>
                                    deleteItemMutation.mutate(itemId)
                                  }
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 lg:hidden">
                        <Tabs
                          value={selectedMobileDay}
                          onValueChange={setSelectedMobileDay}
                          className="space-y-4"
                        >
                          <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1 sm:grid-cols-7">
                            {dayNames.map((dayName, dayOfWeek) => (
                              <TabsTrigger
                                key={dayName}
                                value={String(dayOfWeek)}
                                className="rounded-xl px-2 py-2 text-xs"
                              >
                                {dayName.slice(0, 3)}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {dayNames.map((dayName, dayOfWeek) => {
                            const stats = dayStats[dayOfWeek];

                            return (
                              <TabsContent
                                key={dayName}
                                value={String(dayOfWeek)}
                                className="mt-0"
                              >
                                <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90">
                                  <div className="flex items-start justify-between gap-3 border-border/70 border-b p-4">
                                    <div>
                                      <h3 className="text-xl font-semibold tracking-tight">
                                        {dayName}
                                      </h3>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {stats.mealCount} meals ·{" "}
                                        {Math.round(stats.calories)} kcal
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl"
                                        onClick={() =>
                                          setDuplicateDay(dayOfWeek)
                                        }
                                      >
                                        <Copy className="h-4 w-4" />
                                        <span className="sr-only">
                                          Duplicate {dayName}
                                        </span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl"
                                        disabled={applyPlanMutation.isPending}
                                        onClick={() =>
                                          planData &&
                                          applyPlanMutation.mutate({
                                            planId: planData.id,
                                            dayOfWeek,
                                          })
                                        }
                                      >
                                        <Sparkles className="h-4 w-4" />
                                        <span className="sr-only">
                                          Apply {dayName}
                                        </span>
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-3 p-4">
                                    {mealOrder.map((mealType) => (
                                      <MealCalendarCell
                                        key={`${dayName}-${mealType}-mobile`}
                                        mealType={mealType}
                                        items={
                                          itemsByDayAndMeal[dayOfWeek]?.[
                                            mealType
                                          ] ?? []
                                        }
                                        planId={planData?.id}
                                        isApplying={applyPlanMutation.isPending}
                                        isDeleting={
                                          deleteItemMutation.isPending
                                        }
                                        mobile
                                        onAdd={() =>
                                          setAddItemState({
                                            open: true,
                                            dayOfWeek,
                                            mealType,
                                          })
                                        }
                                        onApply={() =>
                                          planData &&
                                          applyPlanMutation.mutate({
                                            planId: planData.id,
                                            dayOfWeek,
                                            mealType,
                                          })
                                        }
                                        onEdit={setEditingItem}
                                        onDelete={(itemId) =>
                                          deleteItemMutation.mutate(itemId)
                                        }
                                      />
                                    ))}
                                  </div>
                                </section>
                              </TabsContent>
                            );
                          })}
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="shopping" className="space-y-4">
              {shoppingListQuery.isLoading ? (
                <Skeleton className="h-[520px] rounded-3xl" />
              ) : shoppingList ? (
                <div className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
                  <Card className="app-surface">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <ShoppingBasket className="h-5 w-5" />
                            Shopping summary
                          </CardTitle>
                          <CardDescription>
                            Aggregated from the current plan.
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyShoppingList}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy list
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <StatChip
                          label="Planned meals"
                          value={shoppingList.totals.totalItems}
                          icon={CalendarDays}
                        />
                        <StatChip
                          label="Unique foods"
                          value={shoppingList.totals.uniqueFoods}
                          icon={Target}
                        />
                        <StatChip
                          label="Calories"
                          value={`${Math.round(shoppingList.totals.calories)} kcal`}
                          icon={Sparkles}
                        />
                        <StatChip
                          label="Protein"
                          value={`${Math.round(shoppingList.totals.protein)} g`}
                          icon={ShoppingBasket}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium">By meal type</p>
                        {shoppingList.byMealType.map((entry) => (
                          <div
                            key={entry.mealType}
                            className="flex items-center justify-between rounded-2xl border px-3 py-3"
                          >
                            <span>{mealLabels[entry.mealType]}</span>
                            <span className="text-muted-foreground">
                              {entry.itemCount} items ·{" "}
                              {Math.round(entry.totalServings)} servings
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border bg-muted/30 p-3">
                        <p className="mb-2 font-medium">Copy-friendly view</p>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                          {shoppingListText}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="app-surface">
                    <CardHeader>
                      <CardTitle>Aggregated foods</CardTitle>
                      <CardDescription>
                        Foods are grouped by saved food entry and summed by
                        total planned servings.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {shoppingList.items.map((item) => (
                        <div
                          key={item.foodId}
                          className="rounded-[24px] border border-border/70 bg-background/85 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.food.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.food.brand ? `${item.food.brand} · ` : ""}
                                {item.totalServings} servings total ·{" "}
                                {item.food.servingSize}
                                {item.food.servingUnit} each
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {item.mealTypes.map((mealType) => (
                                <Badge key={mealType} variant="secondary">
                                  {mealLabels[mealType]}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                            <span>{Math.round(item.totals.calories)} kcal</span>
                            <span>
                              {Math.round(item.totals.protein)}g protein
                            </span>
                            <span>{Math.round(item.totals.carbs)}g carbs</span>
                            <span>{Math.round(item.totals.fat)}g fat</span>
                          </div>

                          {item.notes.length ? (
                            <div className="mt-3 space-y-1 rounded-xl bg-muted/30 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                Notes
                              </p>
                              {item.notes.map((note) => (
                                <p
                                  key={note.itemId}
                                  className="text-sm text-muted-foreground"
                                >
                                  {dayNames[note.dayOfWeek]}{" "}
                                  {mealLabels[note.mealType]}: {note.note}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </>
      )}

      <MealPlanFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={async (values) => {
          if (editingPlan) {
            await updatePlanMutation.mutateAsync({
              id: editingPlan.id,
              values,
            });
            return;
          }

          await createPlanMutation.mutateAsync(values);
        }}
        plan={editingPlan}
        isSubmitting={isPlanMutating}
      />

      <DeleteMealPlanDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={async () => {
          if (!planData) return;
          await deletePlanMutation.mutateAsync(planData.id);
        }}
        plan={planData}
        isDeleting={deletePlanMutation.isPending}
      />

      <AddMealPlanItemDialog
        open={addItemState.open}
        onOpenChange={(open) =>
          setAddItemState((current) => ({ ...current, open }))
        }
        onSubmit={async (foodId, values) => {
          if (!planData) return;
          await addItemMutation.mutateAsync({
            planId: planData.id,
            foodId,
            dayOfWeek: values.dayOfWeek,
            mealType: values.mealType,
            servings: values.servings,
            notes: values.notes,
          });
        }}
        isSubmitting={addItemMutation.isPending}
        initialDayOfWeek={addItemState.dayOfWeek}
        initialMealType={addItemState.mealType}
      />

      <EditMealPlanItemDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        onSubmit={async (values) => {
          if (!editingItem) return;
          await updateItemMutation.mutateAsync({
            itemId: editingItem.id,
            values,
          });
        }}
        isSubmitting={updateItemMutation.isPending}
      />

      <DuplicateMealPlanDayDialog
        open={duplicateDay !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicateDay(null);
        }}
        initialSourceDay={duplicateDay ?? 0}
        onSubmit={async (values) => {
          if (!planData) return;
          await duplicateDayMutation.mutateAsync({
            planId: planData.id,
            values,
          });
        }}
        isSubmitting={duplicateDayMutation.isPending}
      />
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MealCalendarCell({
  mealType,
  items,
  planId,
  isApplying,
  isDeleting,
  mobile = false,
  onAdd,
  onApply,
  onEdit,
  onDelete,
}: {
  mealType: MealType;
  items: MealPlanItem[];
  planId?: string;
  isApplying: boolean;
  isDeleting: boolean;
  mobile?: boolean;
  onAdd: () => void;
  onApply: () => void;
  onEdit: (item: MealPlanItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const isCompact = !mobile;

  return (
    <section
      className={
        mobile
          ? "space-y-3 rounded-[24px] border border-border/70 bg-background/60 p-3"
          : "min-h-[210px] space-y-3 border-border/70 border-r border-b bg-background/45 p-3 last:border-r-0"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {mobile ? (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1">
              {mealLabels[mealType]}
            </Badge>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {items.length
              ? `${items.length} item${items.length === 1 ? "" : "s"}`
              : "Empty slot"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size={isCompact ? "icon" : "sm"}
            className={
              isCompact ? "h-7 w-7 rounded-xl" : "h-8 rounded-xl px-2 text-xs"
            }
            disabled={!planId || !items.length || isApplying}
            onClick={onApply}
          >
            {isCompact ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span className="sr-only">Apply {mealLabels[mealType]}</span>
              </>
            ) : (
              "Apply"
            )}
          </Button>
          <Button
            variant="outline"
            size={isCompact ? "icon" : "sm"}
            className={
              isCompact ? "h-7 w-7 rounded-xl" : "h-8 rounded-xl px-2 text-xs"
            }
            onClick={onAdd}
          >
            <Plus className={isCompact ? "h-3.5 w-3.5" : "mr-1 h-3.5 w-3.5"} />
            {isCompact ? (
              <span className="sr-only">Add {mealLabels[mealType]}</span>
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={
                isCompact
                  ? "rounded-2xl border border-border/60 bg-card/95 p-2 shadow-sm"
                  : "rounded-[18px] border border-border/60 bg-card/95 p-3 shadow-sm"
              }
            >
              <div
                className={
                  isCompact
                    ? "space-y-2"
                    : "flex items-start justify-between gap-2"
                }
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {item.food.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.servings} x {item.food.servingSize}
                    {item.food.servingUnit} ·{" "}
                    {Math.round(item.food.calories * item.servings)} kcal
                  </p>
                  {item.notes && !isCompact ? (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.notes}
                    </p>
                  ) : null}
                </div>
                <div
                  className={
                    isCompact ? "flex justify-end gap-1" : "flex shrink-0 gap-1"
                  }
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-xl"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-xl text-destructive hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className={
            isCompact
              ? "flex min-h-20 w-full flex-col justify-center rounded-[18px] border border-dashed border-border/80 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30"
              : "flex min-h-24 w-full flex-col justify-center rounded-[18px] border border-dashed border-border/80 px-3 py-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
          }
          onClick={onAdd}
        >
          <span className="text-sm font-medium text-foreground">Add food</span>
          {isCompact ? null : (
            <span className="mt-1 text-xs leading-5 text-muted-foreground">
              Fill this calendar slot.
            </span>
          )}
        </button>
      )}
    </section>
  );
}

function buildShoppingListText(shoppingList: MealPlanShoppingList | null) {
  if (!shoppingList) return "";

  const lines = shoppingList.items.map((item) => {
    const brandPrefix = item.food.brand ? `${item.food.brand} ` : "";
    return `- ${brandPrefix}${item.food.name}: ${formatNumber(item.totalServings)} servings (${formatNumber(item.food.servingSize)}${item.food.servingUnit} each)`;
  });

  return lines.join("\n");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
