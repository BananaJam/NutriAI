type MacroKey = "calories" | "protein" | "carbs" | "fat";

export type NutritionTotals = Record<MacroKey, number>;

export type DailyTotal = {
  date: string;
} & NutritionTotals;

export type MacroTargetSummary = {
  target: number | null;
  average: number;
  averageProgress: number | null;
  daysHitTarget: number;
};

export type RangeSummary = {
  totals: NutritionTotals;
  averages: NutritionTotals;
  daysLogged: number;
  loggedDates: string[];
};

export type TargetAdherence = Record<MacroKey, MacroTargetSummary>;

export type RangeStats = {
  dailyTotals: DailyTotal[];
  averages: NutritionTotals;
  daysLogged: number;
  streak: {
    current: number;
    longest: number;
  };
  rangeSummary: RangeSummary;
  targetAdherence: TargetAdherence;
};

export type NutritionTargets = {
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
};

type ReducibleItem = {
  servings: number;
  food: NutritionTotals;
};

type ReducibleLog = {
  date: Date | string;
  items: ReducibleItem[];
};

export function zeroNutritionTotals(): NutritionTotals {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

export function sumNutritionTotals(items: ReducibleItem[]) {
  return items.reduce((acc, item) => {
    const multiplier = item.servings;
    return {
      calories: acc.calories + item.food.calories * multiplier,
      protein: acc.protein + item.food.protein * multiplier,
      carbs: acc.carbs + item.food.carbs * multiplier,
      fat: acc.fat + item.food.fat * multiplier,
    };
  }, zeroNutritionTotals());
}

export function buildDailyTotals(logs: ReducibleLog[]): DailyTotal[] {
  return logs.map((log) => ({
    date: toDateKey(log.date),
    ...sumNutritionTotals(log.items),
  }));
}

export function buildRangeStats(
  logs: ReducibleLog[],
  targets?: NutritionTargets | null,
): RangeStats {
  const dailyTotals = buildDailyTotals(logs);
  const totals = dailyTotals.reduce((acc, day) => {
    return {
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat,
    };
  }, zeroNutritionTotals());

  const daysLogged = dailyTotals.length;
  const averages = averageTotals(totals, daysLogged);

  return {
    dailyTotals,
    averages,
    daysLogged,
    streak: calculateStreaks(dailyTotals.map((day) => day.date)),
    rangeSummary: {
      totals,
      averages,
      daysLogged,
      loggedDates: dailyTotals.map((day) => day.date),
    },
    targetAdherence: buildTargetAdherence(dailyTotals, targets),
  };
}

export function calculateStreaks(dateKeys: string[]) {
  const normalized = [...new Set(dateKeys)]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();

  if (!normalized.length) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let currentRun = 1;

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = parseDateKey(normalized[index - 1]);
    const current = parseDateKey(normalized[index]);

    if (diffDays(previous, current) === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
      continue;
    }

    currentRun = 1;
  }

  let current = 1;
  for (let index = normalized.length - 1; index > 0; index -= 1) {
    const previous = parseDateKey(normalized[index - 1]);
    const latest = parseDateKey(normalized[index]);

    if (diffDays(previous, latest) !== 1) {
      break;
    }

    current += 1;
  }

  return { current, longest };
}

export function deriveGoalProgress(
  goal: {
    type: string;
    currentValue: number;
    targetValue: number;
  },
  context: {
    profile?: { weight?: number | null } | null;
    stats?: RangeStats | null;
  },
) {
  switch (goal.type) {
    case "WEIGHT_LOSS":
    case "WEIGHT_GAIN":
      return context.profile?.weight ?? goal.currentValue;
    case "CALORIE_TARGET":
      return (
        context.stats?.targetAdherence.calories.average ?? goal.currentValue
      );
    case "PROTEIN_TARGET":
      return (
        context.stats?.targetAdherence.protein.average ?? goal.currentValue
      );
    default:
      return goal.currentValue;
  }
}

function averageTotals(
  totals: NutritionTotals,
  daysLogged: number,
): NutritionTotals {
  if (daysLogged === 0) {
    return zeroNutritionTotals();
  }

  return {
    calories: totals.calories / daysLogged,
    protein: totals.protein / daysLogged,
    carbs: totals.carbs / daysLogged,
    fat: totals.fat / daysLogged,
  };
}

function buildTargetAdherence(
  dailyTotals: DailyTotal[],
  targets?: NutritionTargets | null,
): TargetAdherence {
  const targetMap: Record<MacroKey, number | null | undefined> = {
    calories: targets?.targetCalories,
    protein: targets?.targetProtein,
    carbs: targets?.targetCarbs,
    fat: targets?.targetFat,
  };

  return {
    calories: summarizeMacro("calories", dailyTotals, targetMap.calories),
    protein: summarizeMacro("protein", dailyTotals, targetMap.protein),
    carbs: summarizeMacro("carbs", dailyTotals, targetMap.carbs),
    fat: summarizeMacro("fat", dailyTotals, targetMap.fat),
  };
}

function summarizeMacro(
  key: MacroKey,
  dailyTotals: DailyTotal[],
  target: number | null | undefined,
): MacroTargetSummary {
  const average =
    dailyTotals.length > 0
      ? dailyTotals.reduce((sum, day) => sum + day[key], 0) / dailyTotals.length
      : 0;

  if (!target || target <= 0) {
    return {
      target: null,
      average,
      averageProgress: null,
      daysHitTarget: 0,
    };
  }

  const daysHitTarget = dailyTotals.filter((day) => day[key] >= target).length;

  return {
    target,
    average,
    averageProgress: average / target,
    daysHitTarget,
  };
}

function toDateKey(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return value.slice(0, 10);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function diffDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
