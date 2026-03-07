"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Goal, type GoalStatus } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  GoalFormDialog,
  type GoalFormValues,
} from "@/components/features/goal-form-dialog";
import { DeleteGoalDialog } from "@/components/features/delete-goal-dialog";

const statusColors: Record<GoalStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function GoalsPage() {
  const userId = "demo-user";
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const result = await api.api.goals.get({ query: { userId } });
      if (result.error) throw new Error("Failed to fetch goals");
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const result = await api.api.goals.post({
        userId,
        type: values.type,
        targetValue: values.targetValue,
        unit: values.unit,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
      });
      if (result.error) throw new Error("Failed to create goal");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal created successfully");
      setIsFormOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to create goal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: GoalFormValues }) => {
      const result = await api.api.goals({ id }).put({
        targetValue: values.targetValue,
        currentValue: values.currentValue,
        status: values.status,
        endDate: values.endDate || undefined,
      });
      if (result.error) throw new Error("Failed to update goal");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal updated successfully");
      setIsFormOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api.goals({ id }).delete();
      if (result.error) throw new Error("Failed to delete goal");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted successfully");
      setIsDeleteOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to delete goal");
    },
  });

  const handleAddClick = () => {
    setSelectedGoal(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (values: GoalFormValues) => {
    if (selectedGoal) {
      await updateMutation.mutateAsync({ id: selectedGoal.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedGoal) {
      await deleteMutation.mutateAsync(selectedGoal.id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goals</h2>
          <p className="text-muted-foreground">
            Track your nutrition and fitness goals
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
      ) : !data?.goals?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No goals yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Set your first goal to start tracking your progress
            </p>
            <Button className="mt-4" onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.goals.map((goal) => {
            const progress = (goal.currentValue / goal.targetValue) * 100;
            return (
              <Card key={goal.id} className="group relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="capitalize">
                          {goal.type.replace(/_/g, " ").toLowerCase()}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={statusColors[goal.status as GoalStatus]}
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Started {format(new Date(goal.startDate), "MMM d, yyyy")}
                        {goal.endDate &&
                          ` - Ends ${format(new Date(goal.endDate), "MMM d, yyyy")}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditClick(goal as Goal)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(goal as Goal)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} />
                    <p className="text-xs text-muted-foreground">
                      {progress.toFixed(1)}% complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        goal={selectedGoal}
        isSubmitting={isSubmitting}
      />

      <DeleteGoalDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        goal={selectedGoal}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
