import { treaty } from "@elysiajs/eden";
import type { Api } from "@/server";

// Create type-safe API client using Eden Treaty
// Uses different base URL for server vs client components
const getBaseUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
};

export const api = treaty<Api>(getBaseUrl());

// Re-export types for convenience
export type { Api };

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
  log: {
    items: FoodLogItem[];
  };
  totals: NutritionTotals;
}

export interface FoodsResponse {
  foods: Food[];
}

export interface GoalsResponse {
  goals: Goal[];
}

export interface MealPlansResponse {
  plans: MealPlan[];
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

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
  dailyTotals: Array<{ date: string } & NutritionTotals>;
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
}

export interface MacroTargetSummary {
  target: number | null;
  average: number;
  averageProgress: number | null;
  daysHitTarget: number;
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
  }>;
}

export interface ChatConversationsResponse {
  conversations: ChatConversation[];
}

export interface ChatConversationResponse {
  conversation: ChatConversationDetail;
}
