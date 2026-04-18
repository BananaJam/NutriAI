export type GoalType =
  | "WEIGHT_LOSS"
  | "WEIGHT_GAIN"
  | "CALORIE_TARGET"
  | "PROTEIN_TARGET"
  | "WATER_INTAKE"
  | "CUSTOM";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface GoalLike {
  type: GoalType;
  status: GoalStatus;
  endDate: string | Date | null;
}

export interface GoalSummary {
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  derivedCount: number;
  endingSoonCount: number;
}

export interface GoalFilters {
  status: GoalStatus | null;
  type: GoalType | null;
  derivedOnly: boolean;
}

export const autoTrackedGoalTypes = new Set<GoalType>([
  "WEIGHT_LOSS",
  "WEIGHT_GAIN",
  "CALORIE_TARGET",
  "PROTEIN_TARGET",
]);

export function isAutoTrackedGoal(type: GoalType) {
  return autoTrackedGoalTypes.has(type);
}

export function formatGoalTypeLabel(type: GoalType) {
  return type.replace(/_/g, " ").toLowerCase();
}

export function getGoalProgressPercentage(
  currentValue: number,
  targetValue: number,
) {
  if (targetValue <= 0) return 0;
  return Math.min((currentValue / targetValue) * 100, 100);
}

export function isGoalEndingSoon(
  goal: GoalLike,
  options?: { now?: Date; windowDays?: number },
) {
  if (goal.status !== "ACTIVE" || !goal.endDate) return false;

  const now = stripTime(options?.now ?? new Date());
  const windowDays = options?.windowDays ?? 7;
  const endDate = stripTime(new Date(goal.endDate));
  const diffDays = Math.round(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diffDays >= 0 && diffDays <= windowDays;
}

export function buildGoalSummary(
  goals: GoalLike[],
  options?: { now?: Date; windowDays?: number },
): GoalSummary {
  return goals.reduce<GoalSummary>(
    (summary, goal) => {
      if (goal.status === "ACTIVE") summary.activeCount += 1;
      if (goal.status === "COMPLETED") summary.completedCount += 1;
      if (goal.status === "CANCELLED") summary.cancelledCount += 1;
      if (isAutoTrackedGoal(goal.type)) summary.derivedCount += 1;
      if (isGoalEndingSoon(goal, options)) summary.endingSoonCount += 1;
      return summary;
    },
    {
      activeCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      derivedCount: 0,
      endingSoonCount: 0,
    },
  );
}

function stripTime(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}
