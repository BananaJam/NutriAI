"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import type { Food, MealType } from "@/lib/api";

const logFoodSchema = z.object({
  date: z.string().min(1, "Date is required"),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.number().min(0.1, "Must be at least 0.1"),
  notes: z.string().optional(),
});

export type LogFoodEntryValues = z.infer<typeof logFoodSchema>;

interface LogFoodEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null;
  onSubmit: (values: LogFoodEntryValues) => Promise<void>;
  isSubmitting?: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function LogFoodEntryDialog({
  open,
  onOpenChange,
  food,
  onSubmit,
  isSubmitting = false,
}: LogFoodEntryDialogProps) {
  const form = useForm<LogFoodEntryValues>({
    resolver: zodResolver(logFoodSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    });
  }, [form, open]);

  if (!food) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to food log</DialogTitle>
          <DialogDescription>
            Choose when to log this food and how many servings to add.
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                {isSubmitting ? "Adding..." : "Add to log"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
