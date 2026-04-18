"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type Food,
  type MealPlan,
  type MealType,
  normalizeMealPlansResponse,
} from "@/lib/api";

const addFoodToPlanSchema = z.object({
  mealPlanId: z.string().min(1, "Choose a meal plan"),
  dayOfWeek: z.number().min(0).max(6),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.number().min(0.1, "Must be at least 0.1"),
  notes: z.string().optional(),
});

export type AddFoodToPlanValues = z.infer<typeof addFoodToPlanSchema>;

interface AddFoodToPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null;
  onSubmit: (values: AddFoodToPlanValues) => Promise<void>;
  isSubmitting?: boolean;
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AddFoodToPlanDialog({
  open,
  onOpenChange,
  food,
  onSubmit,
  isSubmitting = false,
}: AddFoodToPlanDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["mealPlans", "chooser"],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get();
      if (result.error) throw new Error("Failed to load meal plans");
      return normalizeMealPlansResponse(result.data);
    },
    enabled: open,
  });

  const activePlan =
    data?.plans.find((plan) => plan.isActive) ?? data?.plans[0];

  const form = useForm<AddFoodToPlanValues>({
    resolver: zodResolver(addFoodToPlanSchema),
    defaultValues: {
      mealPlanId: "",
      dayOfWeek: 1,
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      mealPlanId: activePlan?.id ?? "",
      dayOfWeek: 1,
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    });
  }, [activePlan?.id, form, open]);

  if (!food) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to meal plan</DialogTitle>
          <DialogDescription>
            Choose which plan, day, and meal should include this food.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="font-medium">{food.name}</p>
          <p className="text-sm text-muted-foreground">
            {food.brand ? `${food.brand} · ` : ""}
            {food.servingSize}
            {food.servingUnit} · {food.calories} kcal · P: {food.protein}g
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : !data?.plans.length ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Create a meal plan before adding foods from the catalog.
          </p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                await onSubmit(values);
                onOpenChange(false);
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="mealPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal plan</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {data.plans.map((plan: MealPlan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                            {plan.isActive ? " (Active)" : ""}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        >
                          {dayNames.map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal type</FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.value as MealType)
                          }
                        >
                          <option value="BREAKFAST">Breakfast</option>
                          <option value="LUNCH">Lunch</option>
                          <option value="DINNER">Dinner</option>
                          <option value="SNACK">Snack</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="servings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servings</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional note"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add to plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
