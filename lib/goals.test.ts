import { describe, expect, test } from "bun:test";
import {
  buildGoalSummary,
  formatGoalTypeLabel,
  getGoalProgressPercentage,
  isGoalEndingSoon,
} from "@/lib/goals";

describe("goal helpers", () => {
  test("builds summary counts including derived and ending soon", () => {
    const summary = buildGoalSummary(
      [
        {
          type: "CALORIE_TARGET",
          status: "ACTIVE",
          endDate: "2026-04-20T00:00:00.000Z",
        },
        {
          type: "CUSTOM",
          status: "COMPLETED",
          endDate: null,
        },
        {
          type: "WATER_INTAKE",
          status: "CANCELLED",
          endDate: "2026-05-02T00:00:00.000Z",
        },
        {
          type: "PROTEIN_TARGET",
          status: "ACTIVE",
          endDate: "2026-05-08T00:00:00.000Z",
        },
      ],
      {
        now: new Date("2026-04-18T12:00:00.000Z"),
        windowDays: 7,
      },
    );

    expect(summary).toEqual({
      activeCount: 2,
      completedCount: 1,
      cancelledCount: 1,
      derivedCount: 2,
      endingSoonCount: 1,
    });
  });

  test("detects ending soon only for active goals within the configured window", () => {
    expect(
      isGoalEndingSoon(
        {
          type: "CUSTOM",
          status: "ACTIVE",
          endDate: "2026-04-25T00:00:00.000Z",
        },
        { now: new Date("2026-04-18T00:00:00.000Z"), windowDays: 7 },
      ),
    ).toBe(true);

    expect(
      isGoalEndingSoon(
        {
          type: "CUSTOM",
          status: "COMPLETED",
          endDate: "2026-04-20T00:00:00.000Z",
        },
        { now: new Date("2026-04-18T00:00:00.000Z"), windowDays: 7 },
      ),
    ).toBe(false);
  });

  test("formats goal labels and progress consistently", () => {
    expect(formatGoalTypeLabel("WEIGHT_LOSS")).toBe("weight loss");
    expect(getGoalProgressPercentage(45, 60)).toBe(75);
    expect(getGoalProgressPercentage(120, 100)).toBe(100);
    expect(getGoalProgressPercentage(10, 0)).toBe(0);
  });
});
