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
import type { Goal, GoalStatus, GoalType } from "@/lib/api";

const goalFormSchema = z.object({
  type: z.enum([
    "WEIGHT_LOSS",
    "WEIGHT_GAIN",
    "CALORIE_TARGET",
    "PROTEIN_TARGET",
    "WATER_INTAKE",
    "CUSTOM",
  ]),
  targetValue: z.number().min(0, "Must be 0 or greater"),
  currentValue: z.number().min(0).optional(),
  unit: z.string().min(1, "Unit is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  goal?: Goal | null;
  isSubmitting?: boolean;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const defaultUnitForType: Record<GoalType, string> = {
  WEIGHT_LOSS: "kg",
  WEIGHT_GAIN: "kg",
  CALORIE_TARGET: "kcal",
  PROTEIN_TARGET: "g",
  WATER_INTAKE: "L",
  CUSTOM: "",
};

export function GoalFormDialog({
  open,
  onOpenChange,
  onSubmit,
  goal,
  isSubmitting = false,
}: GoalFormDialogProps) {
  const isEditing = !!goal;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      type: "WEIGHT_LOSS",
      targetValue: 0,
      currentValue: undefined,
      unit: "kg",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
      status: undefined,
    },
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (!isEditing) {
      const unit = defaultUnitForType[watchedType as GoalType] ?? "";
      form.setValue("unit", unit);
    }
  }, [watchedType, isEditing, form]);

  useEffect(() => {
    if (open && goal) {
      form.reset({
        type: goal.type as GoalType,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        unit: goal.unit,
        startDate: goal.startDate.split("T")[0],
        endDate: goal.endDate ? goal.endDate.split("T")[0] : "",
        status: goal.status as GoalStatus,
      });
    } else if (open && !goal) {
      form.reset({
        type: "WEIGHT_LOSS",
        targetValue: 0,
        currentValue: undefined,
        unit: "kg",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: "",
        status: undefined,
      });
    }
  }, [open, goal, form]);

  const handleSubmit = async (values: GoalFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Create Goal"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your goal progress and details."
              : "Set a new nutrition or fitness goal."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Goal Type</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value as GoalType)
                        }
                        disabled={isEditing}
                      >
                        <option value="WEIGHT_LOSS">Weight Loss</option>
                        <option value="WEIGHT_GAIN">Weight Gain</option>
                        <option value="CALORIE_TARGET">Calorie Target</option>
                        <option value="PROTEIN_TARGET">Protein Target</option>
                        <option value="WATER_INTAKE">Water Intake</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl>
                      <Input placeholder="kg, kcal, g, L..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === "" ? undefined : parseFloat(val),
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              (e.target.value as GoalStatus) || undefined,
                            )
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                {isSubmitting
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
