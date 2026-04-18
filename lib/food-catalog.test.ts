import { describe, expect, it } from "bun:test";
import {
  buildFoodCatalogOrderBy,
  buildFoodCatalogWhere,
  rankRecentFoods,
  resolveFoodCatalogSort,
} from "@/lib/food-catalog";

describe("food catalog helpers", () => {
  it("defaults to recent sorting without a search term", () => {
    expect(resolveFoodCatalogSort({})).toEqual({
      sort: "recent",
      direction: "desc",
    });
  });

  it("defaults to name sorting when searching", () => {
    expect(resolveFoodCatalogSort({ search: "yogurt" })).toEqual({
      sort: "name",
      direction: "asc",
    });
  });

  it("builds server-side filters from catalog params", () => {
    expect(
      buildFoodCatalogWhere({
        search: "greek",
        brand: "Fage",
        minProtein: 12,
        maxCalories: 160,
      }),
    ).toEqual({
      OR: [
        { name: { contains: "greek", mode: "insensitive" } },
        { brand: { contains: "greek", mode: "insensitive" } },
      ],
      brand: { equals: "Fage", mode: "insensitive" },
      protein: { gte: 12 },
      calories: { lte: 160 },
    });
  });

  it("builds stable orderings for numeric sorts", () => {
    expect(
      buildFoodCatalogOrderBy({ sort: "protein", direction: "desc" }),
    ).toEqual([{ protein: "desc" }, { calories: "asc" }, { name: "asc" }]);
  });

  it("ranks recent foods by last use, then frequency", () => {
    expect(
      rankRecentFoods([
        { foodId: "a", loggedAt: "2026-04-10T09:00:00.000Z" },
        { foodId: "b", loggedAt: "2026-04-12T09:00:00.000Z" },
        { foodId: "a", loggedAt: "2026-04-12T09:00:00.000Z" },
        { foodId: "c", loggedAt: "2026-04-11T09:00:00.000Z" },
      ]),
    ).toEqual([
      {
        foodId: "a",
        lastUsedAt: "2026-04-12T09:00:00.000Z",
        usageCount: 2,
      },
      {
        foodId: "b",
        lastUsedAt: "2026-04-12T09:00:00.000Z",
        usageCount: 1,
      },
      {
        foodId: "c",
        lastUsedAt: "2026-04-11T09:00:00.000Z",
        usageCount: 1,
      },
    ]);
  });
});
