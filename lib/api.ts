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
}
