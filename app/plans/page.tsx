"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MealPlan } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  MealPlanFormDialog,
  type MealPlanFormValues,
} from "@/components/features/meal-plan-form-dialog";
import { DeleteMealPlanDialog } from "@/components/features/delete-meal-plan-dialog";
import { MealPlanDetailDialog } from "@/components/features/meal-plan-detail-dialog";

export default function MealPlansPage() {
  const userId = "demo-user";
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mealPlans"],
    queryFn: async () => {
      const result = await api.api["meal-plans"].get({ query: { userId } });
      if (result.error) throw new Error("Failed to fetch meal plans");
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: MealPlanFormValues) => {
      const result = await api.api["meal-plans"].post({
        userId,
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      if (result.error) throw new Error("Failed to create meal plan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast.success("Meal plan created successfully");
      setIsFormOpen(false);
      setSelectedPlan(null);
    },
    onError: () => {
      toast.error("Failed to create meal plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api["meal-plans"]({ id }).delete();
      if (result.error) throw new Error("Failed to delete meal plan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast.success("Meal plan deleted successfully");
      setIsDeleteOpen(false);
      setSelectedPlan(null);
    },
    onError: () => {
      toast.error("Failed to delete meal plan");
    },
  });

  const handleAddClick = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (plan: MealPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlan(plan);
    setIsDeleteOpen(true);
  };

  const handleViewClick = (plan: MealPlan) => {
    setSelectedPlan(plan);
    setIsDetailOpen(true);
  };

  const handleFormSubmit = async (values: MealPlanFormValues) => {
    await createMutation.mutateAsync(values);
  };

  const handleDeleteConfirm = async () => {
    if (selectedPlan) {
      await deleteMutation.mutateAsync(selectedPlan.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meal Plans</h2>
          <p className="text-muted-foreground">
            Create and manage your weekly meal plans
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data?.plans?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No meal plans yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Create your first meal plan to start organizing your weekly meals
            </p>
            <Button className="mt-4" onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create Meal Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.plans.map((plan) => (
            <Card key={plan.id} className="group relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      {format(new Date(plan.startDate), "MMM d")} -{" "}
                      {format(new Date(plan.endDate), "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(plan as MealPlan, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {plan.items?.length || 0} meals planned
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => handleViewClick(plan as MealPlan)}
                >
                  View Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MealPlanFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        plan={null}
        isSubmitting={createMutation.isPending}
      />

      <DeleteMealPlanDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        plan={selectedPlan}
        isDeleting={deleteMutation.isPending}
      />

      <MealPlanDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        plan={selectedPlan}
      />
    </div>
  );
}
