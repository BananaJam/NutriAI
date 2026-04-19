import { treaty } from "@elysiajs/eden";

// Keep the browser client decoupled from the server module graph.
// Importing `typeof api` from `@/server` here forced Next/Turbopack to
// analyze the entire Elysia server, Prisma client, and AI routes whenever
// a client route imported this file.
const getBaseUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
};

export const api: ReturnType<typeof treaty> = treaty(getBaseUrl());

// Type helpers extracted from Prisma schema for client-side use
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type GoalType =
  | "WEIGHT_LOSS"
  | "WEIGHT_GAIN"
  | "CALORIE_TARGET"
  | "PROTEIN_TARGET"
  | "WATER_INTAKE"
  | "CUSTOM";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "VERY_ACTIVE";
export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";
export type DashboardRange = "DAYS_7" | "DAYS_30" | "DAYS_90";
export type WeekStart = "MONDAY" | "SUNDAY";

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  barcode?: string | null;
  isVerified?: boolean;
  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodLogItem {
  id: string;
  foodId: string;
  food: Food;
  mealType: MealType;
  servings: number;
  notes: string | null;
  loggedAt: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  notes: string | null;
  items: FoodLogItem[];
}

export interface FoodLogResponse {
  log: FoodLog;
  totals: NutritionTotals;
}

export interface FoodLogsResponse {
  logs: FoodLog[];
}

export type FoodCatalogSort = "name" | "calories" | "protein" | "recent";
export type FoodCatalogDirection = "asc" | "desc";

export interface FoodCatalogFilters {
  search: string;
  brand: string | null;
  minProtein: number | null;
  maxCalories: number | null;
  favoritesOnly: boolean;
  sort: FoodCatalogSort;
  direction: FoodCatalogDirection;
  limit: number;
  offset: number;
}

export interface FoodsResponse {
  foods: Food[];
  total: number;
  hasMore: boolean;
  facets: {
    brands: string[];
  };
  appliedFilters: FoodCatalogFilters;
}

export interface RecentFoodsResponse {
  foods: Food[];
}

export interface GoalsResponse {
  goals: Goal[];
  summary: GoalSummary;
  appliedFilters: GoalFilters;
}

export interface MealPlansResponse {
  plans: MealPlan[];
}

export interface MealPlanResponse {
  plan: MealPlan;
}

export interface MealPlanItemResponse {
  item: MealPlanItem;
}

export interface MealPlanShoppingListItem {
  foodId: string;
  food: Pick<
    Food,
    | "id"
    | "name"
    | "brand"
    | "servingSize"
    | "servingUnit"
    | "calories"
    | "protein"
    | "carbs"
    | "fat"
  >;
  totalServings: number;
  mealCount: number;
  totals: NutritionTotals;
  mealTypes: MealType[];
  notes: Array<{
    itemId: string;
    dayOfWeek: number;
    mealType: MealType;
    note: string;
  }>;
}

export interface MealPlanShoppingMealTypeSummary {
  mealType: MealType;
  itemCount: number;
  totalServings: number;
  totals: NutritionTotals;
}

export interface MealPlanShoppingList {
  items: MealPlanShoppingListItem[];
  totals: {
    totalItems: number;
    uniqueFoods: number;
    totalServings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  byMealType: MealPlanShoppingMealTypeSummary[];
}

export interface MealPlanShoppingListResponse {
  shoppingList: MealPlanShoppingList;
}

export interface ProfileResponse {
  profile: UserProfile | null;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type DailyTotal = { date: string } & NutritionTotals;

export interface UserProfile {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
  activityLevel: ActivityLevel;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string | null;
  status: GoalStatus;
  derivedProgress?: boolean;
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

export interface MealPlanItem {
  id: string;
  foodId: string;
  food: Food;
  dayOfWeek: number;
  mealType: MealType;
  servings: number;
  notes: string | null;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  items: MealPlanItem[];
}

export interface UserStats {
  dailyTotals: DailyTotal[];
  averages: NutritionTotals;
  daysLogged: number;
  streak: {
    current: number;
    longest: number;
  };
  rangeSummary: {
    totals: NutritionTotals;
    averages: NutritionTotals;
    daysLogged: number;
    loggedDates: string[];
  };
  targetAdherence: {
    calories: MacroTargetSummary;
    protein: MacroTargetSummary;
    carbs: MacroTargetSummary;
    fat: MacroTargetSummary;
  };
  previousPeriod: PeriodSummary | null;
  weekdayAverages: WeekdayAverage[];
  mealTypeBreakdown: MealTypeBreakdown[];
  bestDay: {
    calories: DailyStatHighlight | null;
    protein: DailyStatHighlight | null;
  };
  lowestDay: {
    calories: DailyStatHighlight | null;
    protein: DailyStatHighlight | null;
  };
}

export interface MacroTargetSummary {
  target: number | null;
  average: number;
  averageProgress: number | null;
  daysHitTarget: number;
}

export interface PeriodSummary {
  startDate: string | null;
  endDate: string | null;
  totals: NutritionTotals;
  averages: NutritionTotals;
  daysLogged: number;
}

export interface WeekdayAverage {
  weekday: number;
  label: string;
  totals: NutritionTotals;
  averages: NutritionTotals;
  loggedDays: number;
}

export interface MealTypeBreakdown {
  mealType: MealType;
  totals: NutritionTotals;
  averagePerLoggedDay: NutritionTotals;
  loggedDays: number;
}

export interface DailyStatHighlight {
  date: string;
  value: number;
  totals: NutritionTotals;
}

export interface UserSettings {
  themePreference: ThemePreference;
  defaultDashboardRange: DashboardRange;
  compactMode: boolean;
  startWeekOn: WeekStart;
  showCaloriesOnDashboard: boolean;
  showProteinOnDashboard: boolean;
  showStreakOnDashboard: boolean;
  updatedAt: string;
}

export interface UserSettingsPayload {
  settings: UserSettings;
  account: {
    name: string | null;
    email: string;
    image: string | null;
  };
  profile: {
    exists: boolean;
    completionScore: number;
    activityLevel: ActivityLevel | null;
    height: number | null;
    weight: number | null;
    targetCalories: number | null;
    targetProtein: number | null;
    targetCarbs: number | null;
    targetFat: number | null;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export interface ChatToolInvocation {
  toolCallId?: string;
  toolName: string;
  state?: "partial-call" | "call" | "result";
  args?: unknown;
  result?: unknown;
}

export interface ChatConversationDetail {
  id: string;
  title: string | null;
  updatedAt: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    toolInvocations?: ChatToolInvocation[];
  }>;
}

export interface ChatConversationsResponse {
  conversations: ChatConversation[];
}

export interface ChatConversationResponse {
  conversation: ChatConversationDetail;
}

type DateLike = string | Date;

interface RawFood extends Omit<Food, "createdAt" | "updatedAt" | "lastUsedAt"> {
  createdAt?: DateLike;
  updatedAt?: DateLike;
  lastUsedAt?: DateLike | null;
}

interface RawFoodLogItem extends Omit<FoodLogItem, "food" | "loggedAt"> {
  food: RawFood;
  loggedAt: DateLike;
}

interface RawFoodLog extends Omit<FoodLog, "date" | "items"> {
  date: DateLike;
  items: RawFoodLogItem[];
}

interface RawMealPlanItem extends Omit<MealPlanItem, "food"> {
  food: RawFood;
}

interface RawMealPlan
  extends Omit<MealPlan, "startDate" | "endDate" | "items"> {
  startDate: DateLike;
  endDate: DateLike;
  items: RawMealPlanItem[];
}

interface RawMealPlanShoppingFood
  extends Pick<
    Food,
    | "id"
    | "name"
    | "brand"
    | "servingSize"
    | "servingUnit"
    | "calories"
    | "protein"
    | "carbs"
    | "fat"
  > {}

interface RawMealPlanShoppingListItem
  extends Omit<MealPlanShoppingListItem, "food"> {
  food: RawMealPlanShoppingFood;
}

interface RawMealPlanShoppingList extends Omit<MealPlanShoppingList, "items"> {
  items: RawMealPlanShoppingListItem[];
}

interface RawGoal extends Omit<Goal, "startDate" | "endDate"> {
  startDate: DateLike;
  endDate: DateLike | null;
}

interface RawUserProfile extends Omit<UserProfile, "dateOfBirth"> {
  dateOfBirth: DateLike | null;
}

interface RawUserStats
  extends Omit<
    UserStats,
    | "dailyTotals"
    | "previousPeriod"
    | "bestDay"
    | "lowestDay"
    | "weekdayAverages"
  > {
  dailyTotals: Array<{ date: DateLike } & NutritionTotals>;
  previousPeriod: {
    startDate: DateLike | null;
    endDate: DateLike | null;
    totals: NutritionTotals;
    averages: NutritionTotals;
    daysLogged: number;
  } | null;
  weekdayAverages: Array<
    Omit<WeekdayAverage, "totals" | "averages"> & {
      totals: NutritionTotals;
      averages: NutritionTotals;
    }
  >;
  bestDay: {
    calories: ({ date: DateLike } & Omit<DailyStatHighlight, "date">) | null;
    protein: ({ date: DateLike } & Omit<DailyStatHighlight, "date">) | null;
  };
  lowestDay: {
    calories: ({ date: DateLike } & Omit<DailyStatHighlight, "date">) | null;
    protein: ({ date: DateLike } & Omit<DailyStatHighlight, "date">) | null;
  };
}

function toIsoString(value: DateLike) {
  return typeof value === "string" ? value : value.toISOString();
}

function normalizeFood(food: RawFood): Food {
  return {
    ...food,
    lastUsedAt: food.lastUsedAt ? toIsoString(food.lastUsedAt) : null,
    createdAt: food.createdAt ? toIsoString(food.createdAt) : undefined,
    updatedAt: food.updatedAt ? toIsoString(food.updatedAt) : undefined,
  };
}

function normalizeFoodLogItem(item: RawFoodLogItem): FoodLogItem {
  return {
    ...item,
    loggedAt: toIsoString(item.loggedAt),
    food: normalizeFood(item.food),
  };
}

function normalizeFoodLog(log: RawFoodLog): FoodLog {
  return {
    ...log,
    date: toIsoString(log.date),
    items: log.items.map(normalizeFoodLogItem),
  };
}

export function normalizeMealPlan(plan: RawMealPlan): MealPlan {
  return {
    ...plan,
    startDate: toIsoString(plan.startDate),
    endDate: toIsoString(plan.endDate),
    items: plan.items.map(normalizeMealPlanItem),
  };
}

export function normalizeMealPlanItem(item: RawMealPlanItem): MealPlanItem {
  return {
    ...item,
    food: normalizeFood(item.food),
  };
}

export function normalizeFoodLogResponse(payload: {
  log?: RawFoodLog | null;
  totals?: NutritionTotals;
}) {
  if (!payload.log || !payload.totals) {
    throw new Error("Food log payload is missing");
  }

  return {
    log: normalizeFoodLog(payload.log),
    totals: payload.totals,
  } satisfies FoodLogResponse;
}

export function normalizeFoodLogsResponse(payload: { logs?: RawFoodLog[] }) {
  return {
    logs: (payload.logs ?? []).map(normalizeFoodLog),
  } satisfies FoodLogsResponse;
}

function normalizeGoal(goal: RawGoal): Goal {
  return {
    ...goal,
    startDate: toIsoString(goal.startDate),
    endDate: goal.endDate ? toIsoString(goal.endDate) : null,
  };
}

export function normalizeGoalsResponse(payload: {
  goals?: RawGoal[];
  summary?: GoalSummary;
  appliedFilters?: GoalFilters;
}) {
  return {
    goals: (payload.goals ?? []).map(normalizeGoal),
    summary: payload.summary ?? {
      activeCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      derivedCount: 0,
      endingSoonCount: 0,
    },
    appliedFilters: payload.appliedFilters ?? {
      status: null,
      type: null,
      derivedOnly: false,
    },
  } satisfies GoalsResponse;
}

export function normalizeProfileResponse(payload: {
  profile?: RawUserProfile | null;
}) {
  if (!payload.profile) {
    return { profile: null } satisfies ProfileResponse;
  }

  return {
    profile: {
      ...payload.profile,
      dateOfBirth: payload.profile.dateOfBirth
        ? toIsoString(payload.profile.dateOfBirth)
        : null,
    },
  } satisfies ProfileResponse;
}

export function normalizeMealPlansResponse(payload: { plans?: RawMealPlan[] }) {
  return {
    plans: (payload.plans ?? []).map(normalizeMealPlan),
  } satisfies MealPlansResponse;
}

export function normalizeMealPlanResponse(payload: {
  plan?: RawMealPlan | null;
}) {
  if (!payload.plan) {
    throw new Error("Meal plan payload is missing");
  }

  return {
    plan: normalizeMealPlan(payload.plan),
  } satisfies MealPlanResponse;
}

export function normalizeMealPlanItemResponse(payload: {
  item?: RawMealPlanItem | null;
}) {
  if (!payload.item) {
    throw new Error("Meal plan item payload is missing");
  }

  return {
    item: normalizeMealPlanItem(payload.item),
  } satisfies MealPlanItemResponse;
}

export function normalizeMealPlanShoppingListResponse(payload: {
  shoppingList?: RawMealPlanShoppingList | null;
}) {
  if (!payload.shoppingList) {
    throw new Error("Meal plan shopping list payload is missing");
  }

  return {
    shoppingList: {
      ...payload.shoppingList,
      items: payload.shoppingList.items.map((item) => ({
        ...item,
        food: item.food,
      })),
    },
  } satisfies MealPlanShoppingListResponse;
}

export function normalizeUserStatsResponse(
  payload: Partial<RawUserStats>,
): UserStats {
  if (
    !payload.dailyTotals ||
    !payload.rangeSummary ||
    !payload.targetAdherence ||
    !payload.streak ||
    !payload.bestDay ||
    !payload.lowestDay ||
    !payload.mealTypeBreakdown ||
    !payload.weekdayAverages ||
    payload.daysLogged === undefined ||
    !payload.averages
  ) {
    throw new Error("User stats payload is incomplete");
  }

  const {
    dailyTotals,
    previousPeriod,
    bestDay,
    lowestDay,
    weekdayAverages,
    averages,
    daysLogged,
    streak,
    rangeSummary,
    targetAdherence,
    mealTypeBreakdown,
  } = payload;

  const normalizeHighlight = (
    highlight: ({ date: DateLike } & Omit<DailyStatHighlight, "date">) | null,
  ): DailyStatHighlight | null =>
    highlight
      ? {
          ...highlight,
          date: toIsoString(highlight.date),
        }
      : null;

  return {
    dailyTotals: dailyTotals.map((day) => ({
      ...day,
      date: toIsoString(day.date),
    })),
    averages,
    daysLogged,
    streak,
    rangeSummary,
    targetAdherence,
    mealTypeBreakdown,
    previousPeriod: previousPeriod
      ? {
          ...previousPeriod,
          startDate: previousPeriod.startDate
            ? toIsoString(previousPeriod.startDate)
            : null,
          endDate: previousPeriod.endDate
            ? toIsoString(previousPeriod.endDate)
            : null,
        }
      : null,
    weekdayAverages: weekdayAverages.map((weekday) => ({
      ...weekday,
    })),
    bestDay: {
      calories: normalizeHighlight(bestDay.calories),
      protein: normalizeHighlight(bestDay.protein),
    },
    lowestDay: {
      calories: normalizeHighlight(lowestDay.calories),
      protein: normalizeHighlight(lowestDay.protein),
    },
  };
}

export function normalizeChatConversationsResponse(payload: {
  conversations?: Array<{
    id: string;
    title: string;
    preview: string;
    updatedAt: DateLike;
  }>;
}) {
  return {
    conversations: (payload.conversations ?? []).map((conversation) => ({
      ...conversation,
      updatedAt: toIsoString(conversation.updatedAt),
    })),
  } satisfies ChatConversationsResponse;
}

export function normalizeChatConversationResponse(payload: {
  conversation?: {
    id: string;
    title: string | null;
    updatedAt: DateLike;
    createdAt: DateLike;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: DateLike;
      toolInvocations?: unknown;
    }>;
  };
}) {
  if (!payload.conversation) {
    throw new Error("Conversation payload is missing");
  }

  return {
    conversation: {
      ...payload.conversation,
      updatedAt: toIsoString(payload.conversation.updatedAt),
      createdAt: toIsoString(payload.conversation.createdAt),
      messages: payload.conversation.messages.map((message) => ({
        ...message,
        role: message.role === "assistant" ? "assistant" : "user",
        createdAt: toIsoString(message.createdAt),
        toolInvocations: Array.isArray(message.toolInvocations)
          ? (message.toolInvocations as ChatToolInvocation[])
          : undefined,
      })),
    },
  } satisfies ChatConversationResponse;
}
