import { describe, expect, it } from "bun:test";
import {
  buildRangeStats,
  calculateStreaks,
  deriveGoalProgress,
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
});
