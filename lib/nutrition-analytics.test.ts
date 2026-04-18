import { describe, expect, it } from "bun:test";
import {
  buildMealTypeBreakdown,
  buildRangeStats,
  buildWeekdayAverages,
  calculateStreaks,
  deriveGoalProgress,
  getPreviousPeriodBounds,
} from "@/lib/nutrition-analytics";

describe("nutrition analytics", () => {
  it("builds range stats with totals, averages, streaks, and adherence", () => {
    const stats = buildRangeStats(
      [
        {
          date: "2026-04-14",
          items: [
            {
              servings: 1,
              food: { calories: 500, protein: 40, carbs: 50, fat: 20 },
            },
          ],
        },
        {
          date: "2026-04-15",
          items: [
            {
              servings: 2,
              food: { calories: 300, protein: 20, carbs: 25, fat: 10 },
            },
          ],
        },
        {
          date: "2026-04-17",
          items: [
            {
              servings: 1,
              food: { calories: 700, protein: 60, carbs: 70, fat: 25 },
            },
          ],
        },
      ],
      {
        targetCalories: 1800,
        targetProtein: 100,
        targetCarbs: 200,
        targetFat: 70,
      },
    );

    expect(stats.daysLogged).toBe(3);
    expect(stats.rangeSummary.totals.calories).toBe(1800);
    expect(stats.averages.protein).toBeCloseTo(46.6666667, 5);
    expect(stats.streak.longest).toBe(2);
    expect(stats.streak.current).toBe(1);
    expect(stats.targetAdherence.calories.averageProgress).toBeCloseTo(
      1 / 3,
      5,
    );
    expect(stats.targetAdherence.protein.daysHitTarget).toBe(0);
    expect(stats.bestDay.calories?.date).toBe("2026-04-17");
    expect(stats.lowestDay.protein?.date).toBe("2026-04-14");
  });

  it("calculates current and longest streaks from unique dates", () => {
    const streak = calculateStreaks([
      "2026-04-10",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
      "2026-04-14",
    ]);

    expect(streak.longest).toBe(3);
    expect(streak.current).toBe(1);
  });

  it("derives goal progress from profile and stat context when supported", () => {
    const stats = buildRangeStats(
      [
        {
          date: "2026-04-14",
          items: [
            {
              servings: 1,
              food: { calories: 1900, protein: 140, carbs: 210, fat: 60 },
            },
          ],
        },
      ],
      {
        targetCalories: 2000,
        targetProtein: 150,
      },
    );

    expect(
      deriveGoalProgress(
        {
          type: "WEIGHT_LOSS",
          currentValue: 0,
          targetValue: 75,
        },
        { profile: { weight: 82.4 } },
      ),
    ).toBe(82.4);

    expect(
      deriveGoalProgress(
        {
          type: "CALORIE_TARGET",
          currentValue: 0,
          targetValue: 2000,
        },
        { stats },
      ),
    ).toBe(1900);

    expect(
      deriveGoalProgress(
        {
          type: "CUSTOM",
          currentValue: 5,
          targetValue: 10,
        },
        { stats },
      ),
    ).toBe(5);
  });

  it("builds previous period bounds with an inclusive matching range", () => {
    const bounds = getPreviousPeriodBounds("2026-04-10", "2026-04-16");

    expect(bounds.startDate).toBe("2026-04-03");
    expect(bounds.endDate).toBe("2026-04-09");
  });

  it("aggregates weekday averages from daily totals", () => {
    const weekdays = buildWeekdayAverages([
      {
        date: "2026-04-13",
        calories: 1800,
        protein: 130,
        carbs: 210,
        fat: 55,
      },
      {
        date: "2026-04-20",
        calories: 2000,
        protein: 150,
        carbs: 230,
        fat: 60,
      },
    ]);

    expect(weekdays[1].loggedDays).toBe(2);
    expect(weekdays[1].averages.calories).toBe(1900);
    expect(weekdays[1].averages.protein).toBe(140);
  });

  it("builds meal type breakdown from logged foods", () => {
    const breakdown = buildMealTypeBreakdown([
      {
        date: "2026-04-14",
        items: [
          {
            mealType: "BREAKFAST",
            servings: 1,
            food: { calories: 400, protein: 30, carbs: 35, fat: 12 },
          },
          {
            mealType: "DINNER",
            servings: 2,
            food: { calories: 250, protein: 20, carbs: 15, fat: 8 },
          },
        ],
      },
      {
        date: "2026-04-15",
        items: [
          {
            mealType: "BREAKFAST",
            servings: 1,
            food: { calories: 500, protein: 35, carbs: 45, fat: 15 },
          },
        ],
      },
    ]);

    expect(breakdown[0].mealType).toBe("BREAKFAST");
    expect(breakdown[0].loggedDays).toBe(2);
    expect(breakdown[0].totals.calories).toBe(900);
    expect(breakdown[0].averagePerLoggedDay.protein).toBe(32.5);
    expect(breakdown[2].mealType).toBe("DINNER");
    expect(breakdown[2].totals.calories).toBe(500);
  });
});
