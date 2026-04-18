import type { Prisma } from "@/generated/prisma";

export type FoodCatalogSort = "name" | "calories" | "protein" | "recent";
export type FoodCatalogDirection = "asc" | "desc";

export interface FoodCatalogFilters {
  search?: string;
  brand?: string;
  minProtein?: number;
  maxCalories?: number;
  favoritesOnly?: boolean;
  sort?: FoodCatalogSort;
  direction?: FoodCatalogDirection;
}

export function resolveFoodCatalogSort(filters: FoodCatalogFilters) {
  const hasSearch = Boolean(filters.search?.trim());
  const sort = filters.sort ?? (hasSearch ? "name" : "recent");
  const direction =
    filters.direction ??
    (sort === "name" ? "asc" : sort === "recent" ? "desc" : "desc");

  return { sort, direction };
}

export function buildFoodCatalogWhere(
  filters: FoodCatalogFilters,
): Prisma.FoodWhereInput {
  const search = filters.search?.trim();
  const brand = filters.brand?.trim();

  return {
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
    brand: brand ? { equals: brand, mode: "insensitive" } : undefined,
    protein:
      typeof filters.minProtein === "number"
        ? { gte: filters.minProtein }
        : undefined,
    calories:
      typeof filters.maxCalories === "number"
        ? { lte: filters.maxCalories }
        : undefined,
  };
}

export function buildFoodCatalogOrderBy(
  filters: FoodCatalogFilters,
): Prisma.FoodOrderByWithRelationInput[] {
  const { sort, direction } = resolveFoodCatalogSort(filters);

  switch (sort) {
    case "calories":
      return [{ calories: direction }, { protein: "desc" }, { name: "asc" }];
    case "protein":
      return [{ protein: direction }, { calories: "asc" }, { name: "asc" }];
    case "recent":
      return [{ updatedAt: direction }, { name: "asc" }];
    default:
      return [{ name: direction }];
  }
}

export interface RankedFoodUsage {
  foodId: string;
  lastUsedAt: string;
  usageCount: number;
}

export function rankRecentFoods(
  usages: Array<{ foodId: string; loggedAt: string | Date }>,
): RankedFoodUsage[] {
  const usageMap = new Map<
    string,
    { foodId: string; lastUsedAt: Date; usageCount: number }
  >();

  for (const usage of usages) {
    const loggedAt =
      usage.loggedAt instanceof Date
        ? usage.loggedAt
        : new Date(usage.loggedAt);
    const existing = usageMap.get(usage.foodId);

    if (!existing) {
      usageMap.set(usage.foodId, {
        foodId: usage.foodId,
        lastUsedAt: loggedAt,
        usageCount: 1,
      });
      continue;
    }

    existing.usageCount += 1;
    if (loggedAt > existing.lastUsedAt) {
      existing.lastUsedAt = loggedAt;
    }
  }

  return Array.from(usageMap.values())
    .sort((left, right) => {
      const lastUsedDelta =
        right.lastUsedAt.getTime() - left.lastUsedAt.getTime();
      if (lastUsedDelta !== 0) return lastUsedDelta;
      return right.usageCount - left.usageCount;
    })
    .map((usage) => ({
      foodId: usage.foodId,
      lastUsedAt: usage.lastUsedAt.toISOString(),
      usageCount: usage.usageCount,
    }));
}
