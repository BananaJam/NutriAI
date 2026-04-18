"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FoodPicker } from "@/components/features/food-picker";
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
import type { Food, MealType } from "@/lib/api";

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
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

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
            <FoodPicker open={open} onSelect={handleFoodSelect} />

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
