"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { ChevronLeft, Search } from "lucide-react";
import { useState } from "react";
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
import type { Food, MealType } from "@/lib/api";
import { api } from "@/lib/api";

const addFoodSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.number().min(0.1, "Must be at least 0.1"),
  notes: z.string().optional(),
});

type AddFoodFormValues = z.infer<typeof addFoodSchema>;

interface AddFoodLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (foodId: string, values: AddFoodFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AddFoodLogDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: AddFoodLogDialogProps) {
  const [stage, setStage] = useState<"search" | "confirm">("search");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const recentStartDate = subDays(new Date(), 14).toISOString().split("T")[0];

  const { data: foodsData, isLoading: foodsLoading } = useQuery({
    queryKey: ["foods", submittedSearch],
    queryFn: async () => {
      const result = await api.api.foods.get({
        query: { search: submittedSearch || undefined, limit: 10 },
      });
      if (result.error) return null;
      return result.data;
    },
    enabled: open,
  });

  const { data: recentFoodsData } = useQuery({
    queryKey: ["foodLogRecentFoods"],
    queryFn: async () => {
      const result = await api.api["food-logs"].get({
        query: {
          startDate: recentStartDate,
        },
      });
      if (result.error) return [];

      const logs = result.data.logs ?? [];
      const recentFoods = new Map<string, Food>();

      for (const log of logs) {
        for (const item of log.items ?? []) {
          if (!recentFoods.has(item.food.id)) {
            recentFoods.set(item.food.id, item.food as Food);
          }
        }
      }

      return Array.from(recentFoods.values()).slice(0, 6);
    },
    enabled: open,
  });

  const form = useForm<AddFoodFormValues>({
    resolver: zodResolver(addFoodSchema),
    defaultValues: {
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    },
  });

  const handleClose = () => {
    setStage("search");
    setSearch("");
    setSubmittedSearch("");
    setSelectedFood(null);
    form.reset();
    onOpenChange(false);
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setStage("confirm");
  };

  const handleBack = () => {
    setStage("search");
    setSelectedFood(null);
  };

  const handleSubmit = async (values: AddFoodFormValues) => {
    if (!selectedFood) return;
    await onSubmit(selectedFood.id, values);
    handleClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(search);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {stage === "search" ? "Add Food to Log" : "Confirm Food Entry"}
          </DialogTitle>
          <DialogDescription>
            {stage === "search"
              ? "Search for a food to add to your daily log."
              : "Set the meal type and servings for this food."}
          </DialogDescription>
        </DialogHeader>

        {stage === "search" ? (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search foods..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {!submittedSearch && recentFoodsData?.length ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      Recent foods
                    </p>
                  </div>
                  {recentFoodsData.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                      onClick={() => handleFoodSelect(food)}
                    >
                      <p className="font-medium text-sm">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.brand && `${food.brand} · `}
                        {food.servingSize}
                        {food.servingUnit} · {food.calories} kcal · P:{" "}
                        {food.protein}g
                      </p>
                    </button>
                  ))}
                  <div className="pt-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      Search all foods
                    </p>
                  </div>
                </div>
              ) : null}
              {foodsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !foodsData?.foods?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {submittedSearch
                    ? `No results for "${submittedSearch}"`
                    : "Search for foods above"}
                </p>
              ) : (
                foodsData.foods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
                    onClick={() => handleFoodSelect(food as Food)}
                  >
                    <p className="font-medium text-sm">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {food.brand && `${food.brand} · `}
                      {food.servingSize}
                      {food.servingUnit} · {food.calories} kcal · P:{" "}
                      {food.protein}g
                    </p>
                  </button>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {selectedFood && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="font-medium">{selectedFood.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFood.brand && `${selectedFood.brand} · `}
                    {selectedFood.servingSize}
                    {selectedFood.servingUnit} · {selectedFood.calories} kcal
                    per serving
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type *</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value as MealType)
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

              <FormField
                control={form.control}
                name="servings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servings *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 1)
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
                      <Input placeholder="Optional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add to Log"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
