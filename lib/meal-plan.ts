import type { MealType } from "@/lib/api";

export interface MealPlanFoodSummary {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanShoppingSourceItem {
  id: string;
  foodId: string;
  dayOfWeek: number;
  mealType: MealType;
  servings: number;
  notes: string | null;
  food: MealPlanFoodSummary;
}

export interface MealPlanShoppingNote {
  itemId: string;
  dayOfWeek: number;
  mealType: MealType;
  note: string;
}

export interface MealPlanShoppingListItem {
  foodId: string;
  food: MealPlanFoodSummary;
  totalServings: number;
  mealCount: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealTypes: MealType[];
  notes: MealPlanShoppingNote[];
}

export interface MealPlanShoppingMealTypeSummary {
  mealType: MealType;
  itemCount: number;
  totalServings: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
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

export function aggregateMealPlanShoppingList(
  items: MealPlanShoppingSourceItem[],
): MealPlanShoppingList {
  const byFood = new Map<string, MealPlanShoppingListItem>();
  const byMealType = new Map<MealType, MealPlanShoppingMealTypeSummary>();

  for (const item of items) {
    const itemTotals = {
      calories: item.food.calories * item.servings,
      protein: item.food.protein * item.servings,
      carbs: item.food.carbs * item.servings,
      fat: item.food.fat * item.servings,
    };

    const existingFood = byFood.get(item.foodId);
    if (existingFood) {
      existingFood.totalServings += item.servings;
      existingFood.mealCount += 1;
      existingFood.totals.calories += itemTotals.calories;
      existingFood.totals.protein += itemTotals.protein;
      existingFood.totals.carbs += itemTotals.carbs;
      existingFood.totals.fat += itemTotals.fat;
      if (!existingFood.mealTypes.includes(item.mealType)) {
        existingFood.mealTypes.push(item.mealType);
      }
      if (item.notes?.trim()) {
        existingFood.notes.push({
          itemId: item.id,
          dayOfWeek: item.dayOfWeek,
          mealType: item.mealType,
          note: item.notes.trim(),
        });
      }
    } else {
      byFood.set(item.foodId, {
        foodId: item.foodId,
        food: item.food,
        totalServings: item.servings,
        mealCount: 1,
        totals: itemTotals,
        mealTypes: [item.mealType],
        notes: item.notes?.trim()
          ? [
              {
                itemId: item.id,
                dayOfWeek: item.dayOfWeek,
                mealType: item.mealType,
                note: item.notes.trim(),
              },
            ]
          : [],
      });
    }

    const existingMealType = byMealType.get(item.mealType);
    if (existingMealType) {
      existingMealType.itemCount += 1;
      existingMealType.totalServings += item.servings;
      existingMealType.totals.calories += itemTotals.calories;
      existingMealType.totals.protein += itemTotals.protein;
      existingMealType.totals.carbs += itemTotals.carbs;
      existingMealType.totals.fat += itemTotals.fat;
    } else {
      byMealType.set(item.mealType, {
        mealType: item.mealType,
        itemCount: 1,
        totalServings: item.servings,
        totals: itemTotals,
      });
    }
  }

  const normalizedItems = Array.from(byFood.values()).sort((left, right) =>
    left.food.name.localeCompare(right.food.name),
  );

  const totals = normalizedItems.reduce(
    (acc, item) => {
      acc.totalServings += item.totalServings;
      acc.calories += item.totals.calories;
      acc.protein += item.totals.protein;
      acc.carbs += item.totals.carbs;
      acc.fat += item.totals.fat;
      return acc;
    },
    {
      totalItems: items.length,
      uniqueFoods: normalizedItems.length,
      totalServings: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  );

  return {
    items: normalizedItems,
    totals,
    byMealType: Array.from(byMealType.values()).sort(
      (left, right) =>
        mealTypeOrder.indexOf(left.mealType) -
        mealTypeOrder.indexOf(right.mealType),
    ),
  };
}

export interface MealPlanDuplicateItemInput {
  foodId: string;
  dayOfWeek: number;
  mealType: MealType;
  servings: number;
  notes: string | null;
}

export function duplicateMealPlanDayItems(
  items: MealPlanDuplicateItemInput[],
  sourceDayOfWeek: number,
  targetDayOfWeek: number,
) {
  return items
    .filter((item) => item.dayOfWeek === sourceDayOfWeek)
    .map((item) => ({
      ...item,
      dayOfWeek: targetDayOfWeek,
    }));
}

const mealTypeOrder: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
