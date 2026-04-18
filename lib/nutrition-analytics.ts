type MacroKey = "calories" | "protein" | "carbs" | "fat";
type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

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

export type PeriodSummary = {
  startDate: string | null;
  endDate: string | null;
  totals: NutritionTotals;
  averages: NutritionTotals;
  daysLogged: number;
};

export type WeekdayAverage = {
  weekday: number;
  label: string;
  totals: NutritionTotals;
  averages: NutritionTotals;
  loggedDays: number;
};

export type MealTypeBreakdown = {
  mealType: MealType;
  totals: NutritionTotals;
  averagePerLoggedDay: NutritionTotals;
  loggedDays: number;
};

export type DailyHighlight = {
  date: string;
  value: number;
  totals: NutritionTotals;
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
  weekdayAverages: WeekdayAverage[];
  mealTypeBreakdown: MealTypeBreakdown[];
  bestDay: Record<"calories" | "protein", DailyHighlight | null>;
  lowestDay: Record<"calories" | "protein", DailyHighlight | null>;
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
  mealType?: MealType;
};

type ReducibleLog = {
  date: Date | string;
  items: ReducibleItem[];
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

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
    weekdayAverages: buildWeekdayAverages(dailyTotals),
    mealTypeBreakdown: buildMealTypeBreakdown(logs),
    bestDay: {
      calories: buildDayHighlight(dailyTotals, "calories", "max"),
      protein: buildDayHighlight(dailyTotals, "protein", "max"),
    },
    lowestDay: {
      calories: buildDayHighlight(dailyTotals, "calories", "min"),
      protein: buildDayHighlight(dailyTotals, "protein", "min"),
    },
  };
}

export function buildPeriodSummary(
  logs: ReducibleLog[],
  targets?: NutritionTargets | null,
  bounds?: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  },
): PeriodSummary {
  const stats = buildRangeStats(logs, targets);

  return {
    startDate: bounds?.startDate ? toDateKey(bounds.startDate) : null,
    endDate: bounds?.endDate ? toDateKey(bounds.endDate) : null,
    totals: stats.rangeSummary.totals,
    averages: stats.rangeSummary.averages,
    daysLogged: stats.daysLogged,
  };
}

export function getPreviousPeriodBounds(
  startDate: Date | string,
  endDate: Date | string,
) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  const spanDays = diffDays(start, end) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(spanDays - 1));

  return {
    startDate: toDateKey(previousStart),
    endDate: toDateKey(previousEnd),
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

export function buildWeekdayAverages(
  dailyTotals: DailyTotal[],
): WeekdayAverage[] {
  const weekdays = weekdayLabels.map((label, weekday) => ({
    weekday,
    label,
    totals: zeroNutritionTotals(),
    loggedDays: 0,
  }));

  for (const day of dailyTotals) {
    const weekday = parseDateKey(day.date).getUTCDay();
    const current = weekdays[weekday];

    current.loggedDays += 1;
    current.totals = {
      calories: current.totals.calories + day.calories,
      protein: current.totals.protein + day.protein,
      carbs: current.totals.carbs + day.carbs,
      fat: current.totals.fat + day.fat,
    };
  }

  return weekdays.map((day) => ({
    weekday: day.weekday,
    label: day.label,
    totals: day.totals,
    averages: averageTotals(day.totals, day.loggedDays),
    loggedDays: day.loggedDays,
  }));
}

export function buildMealTypeBreakdown(
  logs: ReducibleLog[],
): MealTypeBreakdown[] {
  const breakdown = new Map<
    MealType,
    {
      totals: NutritionTotals;
      loggedDates: Set<string>;
    }
  >(
    mealTypes.map((mealType) => [
      mealType,
      { totals: zeroNutritionTotals(), loggedDates: new Set<string>() },
    ]),
  );

  for (const log of logs) {
    const dateKey = toDateKey(log.date);

    for (const item of log.items) {
      if (!item.mealType) continue;

      const current = breakdown.get(item.mealType);
      if (!current) continue;

      current.loggedDates.add(dateKey);
      current.totals = {
        calories: current.totals.calories + item.food.calories * item.servings,
        protein: current.totals.protein + item.food.protein * item.servings,
        carbs: current.totals.carbs + item.food.carbs * item.servings,
        fat: current.totals.fat + item.food.fat * item.servings,
      };
    }
  }

  return mealTypes.map((mealType) => {
    const current = breakdown.get(mealType) ?? {
      totals: zeroNutritionTotals(),
      loggedDates: new Set<string>(),
    };
    const loggedDays = current.loggedDates.size;

    return {
      mealType,
      totals: current.totals,
      averagePerLoggedDay: averageTotals(current.totals, loggedDays),
      loggedDays,
    };
  });
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

function buildDayHighlight(
  dailyTotals: DailyTotal[],
  key: "calories" | "protein",
  direction: "max" | "min",
): DailyHighlight | null {
  if (!dailyTotals.length) {
    return null;
  }

  const selected = dailyTotals.reduce((best, current) => {
    if (direction === "max") {
      return current[key] > best[key] ? current : best;
    }

    return current[key] < best[key] ? current : best;
  });

  return {
    date: selected.date,
    value: selected[key],
    totals: {
      calories: selected.calories,
      protein: selected.protein,
      carbs: selected.carbs,
      fat: selected.fat,
    },
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

function parseDateValue(value: Date | string) {
  return value instanceof Date ? value : parseDateKey(value.slice(0, 10));
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function diffDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * 86_400_000);
}
