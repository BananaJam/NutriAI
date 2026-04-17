"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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

const addItemSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.number().min(0.1, "Must be at least 0.1"),
  notes: z.string().optional(),
});

type AddItemFormValues = z.infer<typeof addItemSchema>;

interface AddMealPlanItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (foodId: string, values: AddItemFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AddMealPlanItemDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: AddMealPlanItemDialogProps) {
  const [stage, setStage] = useState<"search" | "confirm">("search");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

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

  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      dayOfWeek: 1,
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

  const handleSubmit = async (values: AddItemFormValues) => {
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
            {stage === "search" ? "Add Item to Plan" : "Configure Meal Item"}
          </DialogTitle>
          <DialogDescription>
            {stage === "search"
              ? "Search for a food to add to your meal plan."
              : "Set the day, meal type, and servings."}
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
                      {food.servingUnit} · {food.calories} kcal
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

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week *</FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10))
                          }
                        >
                          {dayNames.map((day, i) => (
                            <option key={day} value={i}>
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
              </div>

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
                  {isSubmitting ? "Adding..." : "Add to Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
