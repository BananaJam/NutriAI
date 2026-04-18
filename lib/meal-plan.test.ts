import { describe, expect, test } from "bun:test";
import {
  aggregateMealPlanShoppingList,
  duplicateMealPlanDayItems,
} from "@/lib/meal-plan";

describe("aggregateMealPlanShoppingList", () => {
  test("groups items by food and preserves meal notes", () => {
    const result = aggregateMealPlanShoppingList([
      {
        id: "a",
        foodId: "food-1",
        dayOfWeek: 1,
        mealType: "BREAKFAST",
        servings: 1,
        notes: "Use frozen berries",
        food: {
          id: "food-1",
          name: "Greek Yogurt",
          brand: "Fage",
          servingSize: 170,
          servingUnit: "g",
          calories: 100,
          protein: 18,
          carbs: 6,
          fat: 0,
        },
      },
      {
        id: "b",
        foodId: "food-1",
        dayOfWeek: 3,
        mealType: "SNACK",
        servings: 2,
        notes: null,
        food: {
          id: "food-1",
          name: "Greek Yogurt",
          brand: "Fage",
          servingSize: 170,
          servingUnit: "g",
          calories: 100,
          protein: 18,
          carbs: 6,
          fat: 0,
        },
      },
      {
        id: "c",
        foodId: "food-2",
        dayOfWeek: 1,
        mealType: "LUNCH",
        servings: 1.5,
        notes: "Roast ahead",
        food: {
          id: "food-2",
          name: "Chicken Breast",
          brand: null,
          servingSize: 120,
          servingUnit: "g",
          calories: 180,
          protein: 32,
          carbs: 0,
          fat: 4,
        },
      },
    ]);

    expect(result.totals.totalItems).toBe(3);
    expect(result.totals.uniqueFoods).toBe(2);
    expect(result.items[1]?.food.name).toBe("Greek Yogurt");
    expect(result.items[1]?.totalServings).toBe(3);
    expect(result.items[1]?.mealTypes).toEqual(["BREAKFAST", "SNACK"]);
    expect(result.items[1]?.notes).toEqual([
      {
        itemId: "a",
        dayOfWeek: 1,
        mealType: "BREAKFAST",
        note: "Use frozen berries",
      },
    ]);
    expect(result.byMealType.map((entry) => entry.mealType)).toEqual([
      "BREAKFAST",
      "LUNCH",
      "SNACK",
    ]);
  });
});

describe("duplicateMealPlanDayItems", () => {
  test("duplicates only the selected source day into the target day", () => {
    const result = duplicateMealPlanDayItems(
      [
        {
          foodId: "food-1",
          dayOfWeek: 1,
          mealType: "BREAKFAST",
          servings: 1,
          notes: null,
        },
        {
          foodId: "food-2",
          dayOfWeek: 1,
          mealType: "DINNER",
          servings: 2,
          notes: "Extra greens",
        },
        {
          foodId: "food-3",
          dayOfWeek: 4,
          mealType: "LUNCH",
          servings: 1,
          notes: null,
        },
      ],
      1,
      5,
    );

    expect(result).toEqual([
      {
        foodId: "food-1",
        dayOfWeek: 5,
        mealType: "BREAKFAST",
        servings: 1,
        notes: null,
      },
      {
        foodId: "food-2",
        dayOfWeek: 5,
        mealType: "DINNER",
        servings: 2,
        notes: "Extra greens",
      },
    ]);
  });
});
