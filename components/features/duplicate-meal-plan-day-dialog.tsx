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

const duplicateDaySchema = z
  .object({
    sourceDayOfWeek: z.number().min(0).max(6),
    targetDayOfWeek: z.number().min(0).max(6),
  })
  .refine((data) => data.sourceDayOfWeek !== data.targetDayOfWeek, {
    message: "Pick a different target day",
    path: ["targetDayOfWeek"],
  });

export type DuplicateMealPlanDayValues = z.infer<typeof duplicateDaySchema>;

interface DuplicateMealPlanDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DuplicateMealPlanDayValues) => Promise<void>;
  initialSourceDay?: number;
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

export function DuplicateMealPlanDayDialog({
  open,
  onOpenChange,
  onSubmit,
  initialSourceDay = 0,
  isSubmitting = false,
}: DuplicateMealPlanDayDialogProps) {
  const form = useForm<DuplicateMealPlanDayValues>({
    resolver: zodResolver(duplicateDaySchema),
    defaultValues: {
      sourceDayOfWeek: initialSourceDay,
      targetDayOfWeek: initialSourceDay === 6 ? 0 : initialSourceDay + 1,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      sourceDayOfWeek: initialSourceDay,
      targetDayOfWeek: initialSourceDay === 6 ? 0 : initialSourceDay + 1,
    });
  }, [form, initialSourceDay, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate day plan</DialogTitle>
          <DialogDescription>
            Copy every meal from one day into another day in this plan. The
            target day will be replaced.
          </DialogDescription>
        </DialogHeader>

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
              name="sourceDayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Copy from</FormLabel>
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
              name="targetDayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paste into</FormLabel>
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
                {isSubmitting ? "Duplicating..." : "Duplicate day"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
