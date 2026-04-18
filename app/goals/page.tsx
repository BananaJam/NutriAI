"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DeleteGoalDialog } from "@/components/features/delete-goal-dialog";
import {
  GoalFormDialog,
  type GoalFormValues,
} from "@/components/features/goal-form-dialog";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  type Goal,
  type GoalStatus,
  type GoalType,
  normalizeGoalsResponse,
} from "@/lib/api";
import {
  formatGoalTypeLabel,
  getGoalProgressPercentage,
  isGoalEndingSoon,
} from "@/lib/goals";
import { useSessionUser } from "@/lib/use-session-user";

const statusLabels: Record<StatusFilter, string> = {
  ALL: "All",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusColors: Record<GoalStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const goalTypeOptions: Array<{ value: GoalType | "ALL"; label: string }> = [
  { value: "ALL", label: "All goal types" },
  { value: "WEIGHT_LOSS", label: "Weight loss" },
  { value: "WEIGHT_GAIN", label: "Weight gain" },
  { value: "CALORIE_TARGET", label: "Calorie target" },
  { value: "PROTEIN_TARGET", label: "Protein target" },
  { value: "WATER_INTAKE", label: "Water intake" },
  { value: "CUSTOM", label: "Custom" },
];

type StatusFilter = "ALL" | GoalStatus;

export default function GoalsPage() {
  const { userId } = useSessionUser();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<GoalType | "ALL">("ALL");
  const [derivedOnly, setDerivedOnly] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const goalsQuery = useQuery({
    queryKey: ["goals", statusFilter, typeFilter, derivedOnly],
    queryFn: async () => {
      const result = await api.api.goals.get({
        query: {
          status: statusFilter === "ALL" ? undefined : statusFilter,
          type: typeFilter === "ALL" ? undefined : typeFilter,
          derivedOnly: derivedOnly || undefined,
        },
      });
      if (result.error || !("goals" in result.data)) {
        throw new Error("Failed to fetch goals");
      }
      return normalizeGoalsResponse(result.data);
    },
    enabled: !!userId,
  });

  const invalidateGoalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["progressGoals"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const result = await api.api.goals.post({
        type: values.type,
        targetValue: values.targetValue,
        unit: values.unit,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
      });
      if (result.error) throw new Error("Failed to create goal");
      return result.data;
    },
    onSuccess: async () => {
      await invalidateGoalQueries();
      toast.success("Goal created");
      setIsFormOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to create goal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: GoalFormValues;
    }) => {
      const result = await api.api.goals({ id }).put({
        targetValue: values.targetValue,
        currentValue: values.currentValue,
        status: values.status,
        endDate: values.endDate || undefined,
      });
      if (result.error) throw new Error("Failed to update goal");
      return result.data;
    },
    onSuccess: async () => {
      await invalidateGoalQueries();
      toast.success("Goal updated");
      setIsFormOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({
      goal,
      status,
    }: {
      goal: Goal;
      status: GoalStatus;
    }) => {
      const result = await api.api.goals({ id: goal.id }).put({
        status,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        endDate: goal.endDate ?? undefined,
      });
      if (result.error) throw new Error("Failed to update goal status");
      return result.data;
    },
    onSuccess: async (_, variables) => {
      await invalidateGoalQueries();
      toast.success(
        variables.status === "COMPLETED"
          ? "Goal marked complete"
          : variables.status === "ACTIVE"
            ? "Goal reopened"
            : "Goal cancelled",
      );
    },
    onError: () => {
      toast.error("Failed to update goal status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api.goals({ id }).delete();
      if (result.error) throw new Error("Failed to delete goal");
      return result.data;
    },
    onSuccess: async () => {
      await invalidateGoalQueries();
      toast.success("Goal deleted");
      setIsDeleteOpen(false);
      setSelectedGoal(null);
    },
    onError: () => {
      toast.error("Failed to delete goal");
    },
  });

  const goals = goalsQuery.data?.goals ?? [];
  const summary = goalsQuery.data?.summary ?? {
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    derivedCount: 0,
    endingSoonCount: 0,
  };
  const isLoading = goalsQuery.isLoading;
  const hasAnyGoals =
    summary.activeCount + summary.completedCount + summary.cancelledCount > 0;

  const emptyState = useMemo(() => {
    if (!hasAnyGoals) {
      return {
        title: "No goals yet",
        description:
          "Create your first goal to turn dashboard and progress summaries into something trackable.",
        cta: "Create goal",
      };
    }

    if (statusFilter === "ACTIVE") {
      return {
        title: "No active goals",
        description:
          "Reopen an older goal or create a new one so current progress has a target.",
        cta: "Create active goal",
      };
    }

    if (statusFilter === "COMPLETED") {
      return {
        title: "No completed goals",
        description:
          "Completed goals will stay here as lightweight history once you finish them.",
        cta: "View active goals",
      };
    }

    return {
      title: "No goals match these filters",
      description:
        "Try a different status, type, or derived-only setting to broaden the workspace view.",
      cta: "Reset filters",
    };
  }, [hasAnyGoals, statusFilter]);

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    lifecycleMutation.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Target tracking"
        title="Goals"
        description="Manage active targets, review completed work, and keep auto-tracked progress visible in one workspace."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/progress">
              <Button variant="outline" className="rounded-xl">
                <ArrowRight className="mr-2 h-4 w-4" />
                View progress
              </Button>
            </Link>
            <Button
              className="rounded-xl"
              onClick={() => {
                setSelectedGoal(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New goal
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">How this works: </span>
        <span className="font-medium text-foreground">Profile targets</span> are
        your daily calorie and macro baselines — set them in{" "}
        <Link
          href="/profile"
          className="text-primary underline-offset-2 hover:underline"
        >
          Profile
        </Link>
        . <span className="font-medium text-foreground">Goals</span> here are
        explicit time-bound milestones (e.g. hit 150g protein daily for 30
        days). <span className="font-medium text-foreground">Adherence</span> —
        how closely your logged meals matched targets — lives in{" "}
        <Link
          href="/progress"
          className="text-primary underline-offset-2 hover:underline"
        >
          Progress
        </Link>
        .
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active goals"
          value={summary?.activeCount ?? 0}
          description="Current goals still in motion."
          icon={Target}
        />
        <SummaryCard
          title="Completed"
          value={summary?.completedCount ?? 0}
          description="Goals already finished."
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Auto-tracked"
          value={summary?.derivedCount ?? 0}
          description="Derived from profile or log data."
          icon={RotateCcw}
        />
        <SummaryCard
          title="Ending soon"
          value={summary?.endingSoonCount ?? 0}
          description="Active goals ending in 7 days."
          icon={Filter}
        />
      </div>

      <Card className="app-surface">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Goal workspace</CardTitle>
            <CardDescription>
              Filter goals by status, type, and auto-tracked behavior.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="flex h-10 min-w-[180px] rounded-xl border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as GoalType | "ALL")
              }
            >
              {goalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant={derivedOnly ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setDerivedOnly((current) => !current)}
            >
              Auto-tracked only
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              {Object.entries(statusLabels).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-48 rounded-3xl" />
              <Skeleton className="h-48 rounded-3xl" />
            </div>
          ) : goals.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => {
                    setSelectedGoal(goal);
                    setIsFormOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedGoal(goal);
                    setIsDeleteOpen(true);
                  }}
                  onMarkComplete={() =>
                    lifecycleMutation.mutate({
                      goal,
                      status: "COMPLETED",
                    })
                  }
                  onReopen={() =>
                    lifecycleMutation.mutate({
                      goal,
                      status: "ACTIVE",
                    })
                  }
                  onCancel={() =>
                    lifecycleMutation.mutate({
                      goal,
                      status: "CANCELLED",
                    })
                  }
                  isMutating={isSubmitting || deleteMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
              <Target className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{emptyState.title}</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {emptyState.description}
              </p>
              {hasAnyGoals && (typeFilter !== "ALL" || derivedOnly) ? (
                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  onClick={() => {
                    setTypeFilter("ALL");
                    setDerivedOnly(false);
                    if (statusFilter !== "ACTIVE") setStatusFilter("ACTIVE");
                  }}
                >
                  Reset filters
                </Button>
              ) : (
                <Button
                  className="mt-5 rounded-xl"
                  onClick={() => {
                    setSelectedGoal(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {emptyState.cta}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={async (values) => {
          if (selectedGoal) {
            await updateMutation.mutateAsync({ id: selectedGoal.id, values });
            return;
          }

          await createMutation.mutateAsync(values);
        }}
        goal={selectedGoal}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteGoalDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={async () => {
          if (!selectedGoal) return;
          await deleteMutation.mutateAsync(selectedGoal.id);
        }}
        goal={selectedGoal}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Target;
}) {
  return (
    <Card className="app-surface">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onMarkComplete,
  onReopen,
  onCancel,
  isMutating,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onMarkComplete: () => void;
  onReopen: () => void;
  onCancel: () => void;
  isMutating: boolean;
}) {
  const progress = getGoalProgressPercentage(
    goal.currentValue,
    goal.targetValue,
  );
  const endingSoon = isGoalEndingSoon(goal);

  return (
    <Card className="app-surface">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="capitalize">
                {formatGoalTypeLabel(goal.type)}
              </CardTitle>
              <Badge variant="secondary" className={statusColors[goal.status]}>
                {goal.status}
              </Badge>
              {goal.derivedProgress ? (
                <Badge variant="secondary">Auto-tracked</Badge>
              ) : null}
              {endingSoon ? <Badge variant="outline">Ending soon</Badge> : null}
            </div>
            <CardDescription>
              Started {format(new Date(goal.startDate), "MMM d, yyyy")}
              {goal.endDate
                ? ` · Ends ${format(new Date(goal.endDate), "MMM d, yyyy")}`
                : ""}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Goal actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit goal</DropdownMenuItem>
              {goal.status !== "COMPLETED" ? (
                <DropdownMenuItem
                  disabled={isMutating}
                  onClick={onMarkComplete}
                >
                  Mark complete
                </DropdownMenuItem>
              ) : null}
              {goal.status !== "ACTIVE" ? (
                <DropdownMenuItem disabled={isMutating} onClick={onReopen}>
                  Reopen
                </DropdownMenuItem>
              ) : null}
              {goal.status !== "CANCELLED" ? (
                <DropdownMenuItem disabled={isMutating} onClick={onCancel}>
                  Cancel
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isMutating}
                onClick={onDelete}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatGoalValue(goal.currentValue)}
              {goal.unit}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>
              of {formatGoalValue(goal.targetValue)}
              {goal.unit}
            </p>
            {goal.endDate ? (
              <p>
                {goal.status === "ACTIVE"
                  ? formatDistanceToNowStrict(new Date(goal.endDate), {
                      addSuffix: true,
                    })
                  : "Historical"}
              </p>
            ) : null}
          </div>
        </div>

        <Progress value={progress} />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(1)}% complete</span>
          <Link
            href="/progress"
            className="inline-flex items-center font-medium text-primary"
          >
            View progress
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        {!goal.derivedProgress ? (
          <div className="rounded-2xl border bg-background/70 p-3 text-xs text-muted-foreground">
            Manual progress goal. Current value can be updated directly in edit
            mode.
          </div>
        ) : (
          <div className="rounded-2xl border bg-background/70 p-3 text-xs text-muted-foreground">
            Auto-tracked from profile metrics or recent food log data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatGoalValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
