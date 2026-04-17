"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import type { FoodLogItem, MealType } from "@/lib/api";

const formSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servings: z.number().min(0.1, "Must be at least 0.1"),
  notes: z.string().optional(),
});

export type EditFoodLogItemValues = z.infer<typeof formSchema>;

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function EditFoodLogItemDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoodLogItem | null;
  onSubmit: (values: EditFoodLogItemValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const form = useForm<EditFoodLogItemValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: "BREAKFAST",
      servings: 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open || !item) return;

    form.reset({
      mealType: item.mealType,
      servings: item.servings,
      notes: item.notes ?? "",
    });
  }, [form, item, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit log item</DialogTitle>
          <DialogDescription>
            Update the meal slot, servings, or notes for this entry.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {item ? (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium">{item.food.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.food.brand && `${item.food.brand} · `}
                  {item.food.servingSize}
                  {item.food.servingUnit} per serving
                </p>
              </div>
            ) : null}

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

            <FormField
              control={form.control}
              name="servings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servings</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      {...field}
                      onChange={(event) =>
                        field.onChange(parseFloat(event.target.value) || 1)
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
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
