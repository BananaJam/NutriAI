import { Elysia, t } from "elysia";
import {
  buildFoodCatalogWhere,
  type FoodCatalogDirection,
  type FoodCatalogSort,
  rankRecentFoods,
  resolveFoodCatalogSort,
} from "@/lib/food-catalog";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

const sortSchema = t.Union([
  t.Literal("name"),
  t.Literal("calories"),
  t.Literal("protein"),
  t.Literal("recent"),
]);

const directionSchema = t.Union([t.Literal("asc"), t.Literal("desc")]);

function sortFoodsWithMetadata(
  foods: Array<{
    name: string;
    calories: number;
    protein: number;
    updatedAt: Date;
    usageCount: number;
    lastUsedAt: string | null;
  }>,
  sort: FoodCatalogSort,
  direction: FoodCatalogDirection,
) {
  return [...foods].sort((left, right) => {
    if (sort === "recent") {
      const leftTime = left.lastUsedAt
        ? new Date(left.lastUsedAt).getTime()
        : 0;
      const rightTime = right.lastUsedAt
        ? new Date(right.lastUsedAt).getTime()
        : 0;
      const recentDelta =
        direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
      if (recentDelta !== 0) return recentDelta;

      const usageDelta =
        direction === "asc"
          ? left.usageCount - right.usageCount
          : right.usageCount - left.usageCount;
      if (usageDelta !== 0) return usageDelta;

      return left.name.localeCompare(right.name);
    }

    const numericField =
      sort === "protein"
        ? "protein"
        : sort === "calories"
          ? "calories"
          : "name";

    if (numericField === "name") {
      return direction === "asc"
        ? left.name.localeCompare(right.name)
        : right.name.localeCompare(left.name);
    }

    const delta =
      direction === "asc"
        ? left[numericField] - right[numericField]
        : right[numericField] - left[numericField];

    if (delta !== 0) return delta;
    return left.name.localeCompare(right.name);
  });
}

function serializeFood(food: {
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
  barcode: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  favorites: Array<{ id: string }>;
  foodLogs: Array<{ loggedAt: Date }>;
}) {
  const lastUsedAt = food.foodLogs[0]?.loggedAt?.toISOString() ?? null;

  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar,
    sodium: food.sodium,
    barcode: food.barcode,
    isVerified: food.isVerified,
    isFavorite: food.favorites.length > 0,
    usageCount: food.foodLogs.length,
    lastUsedAt,
    createdAt: food.createdAt.toISOString(),
    updatedAt: food.updatedAt.toISOString(),
  };
}

export const foodsRoutes = new Elysia({ prefix: "/foods" })
  .get(
    "/",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const {
        search,
        brand,
        minProtein,
        maxCalories,
        favoritesOnly = false,
        limit = 20,
        offset = 0,
      } = query;

      const { sort, direction } = resolveFoodCatalogSort({
        search,
        sort: query.sort,
        direction: query.direction,
      });

      const foods = await prisma.food.findMany({
        where: {
          ...buildFoodCatalogWhere({
            search,
            brand,
            minProtein,
            maxCalories,
          }),
          favorites: favoritesOnly
            ? { some: { userId: session.user.id } }
            : undefined,
        },
        include: {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          foodLogs: {
            where: {
              foodLog: { userId: session.user.id },
            },
            select: { loggedAt: true },
            orderBy: { loggedAt: "desc" },
          },
        },
      });

      const serializedFoods = sortFoodsWithMetadata(
        foods.map((food) => {
          const serialized = serializeFood(food);
          return {
            ...serialized,
            updatedAt: food.updatedAt,
          };
        }),
        sort,
        direction,
      );

      const brands = Array.from(
        new Set(
          foods
            .map((food) => food.brand?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .slice(0, 8);

      return {
        foods: serializedFoods
          .slice(offset, offset + limit)
          .map(({ updatedAt: _updatedAt, ...food }) => food),
        total: serializedFoods.length,
        hasMore: offset + limit < serializedFoods.length,
        facets: {
          brands,
        },
        appliedFilters: {
          search: search ?? "",
          brand: brand ?? null,
          minProtein: minProtein ?? null,
          maxCalories: maxCalories ?? null,
          favoritesOnly,
          sort,
          direction,
          limit,
          offset,
        },
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        brand: t.Optional(t.String()),
        minProtein: t.Optional(t.Number()),
        maxCalories: t.Optional(t.Number()),
        favoritesOnly: t.Optional(t.Boolean()),
        sort: t.Optional(sortSchema),
        direction: t.Optional(directionSchema),
        limit: t.Optional(t.Number({ default: 20 })),
        offset: t.Optional(t.Number({ default: 0 })),
      }),
    },
  )
  .get(
    "/recent",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const limit = query.limit ?? 8;
      const days = query.days ?? 14;
      const startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - days);

      const usages = await prisma.foodLogItem.findMany({
        where: {
          foodLog: {
            userId: session.user.id,
            date: {
              gte: startDate,
            },
          },
        },
        select: {
          foodId: true,
          loggedAt: true,
        },
        orderBy: { loggedAt: "desc" },
      });

      const rankedUsages = rankRecentFoods(usages).slice(0, limit);
      const foods = await prisma.food.findMany({
        where: {
          id: {
            in: rankedUsages.map((usage) => usage.foodId),
          },
        },
        include: {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          foodLogs: {
            where: {
              foodLog: { userId: session.user.id },
            },
            select: { loggedAt: true },
            orderBy: { loggedAt: "desc" },
          },
        },
      });

      const foodMap = new Map(
        foods.map((food) => [food.id, serializeFood(food)]),
      );

      return {
        foods: rankedUsages
          .map((usage) => foodMap.get(usage.foodId))
          .filter((food): food is NonNullable<typeof food> => Boolean(food)),
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ default: 8 })),
        days: t.Optional(t.Number({ default: 14 })),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const food = await prisma.food.findUnique({
        where: { id: params.id },
        include: {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          foodLogs: {
            where: {
              foodLog: { userId: session.user.id },
            },
            select: { loggedAt: true },
            orderBy: { loggedAt: "desc" },
          },
        },
      });

      if (!food) {
        set.status = 404;
        return { message: "Food not found" };
      }

      return { food: serializeFood(food) };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/",
    async ({ request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const food = await prisma.food.create({
        data: body,
        include: {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          foodLogs: {
            where: {
              foodLog: { userId: session.user.id },
            },
            select: { loggedAt: true },
            orderBy: { loggedAt: "desc" },
          },
        },
      });

      return { food: serializeFood(food) };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        brand: t.Optional(t.String()),
        servingSize: t.Number({ minimum: 0 }),
        servingUnit: t.Optional(t.String({ default: "g" })),
        calories: t.Number({ minimum: 0 }),
        protein: t.Number({ minimum: 0 }),
        carbs: t.Number({ minimum: 0 }),
        fat: t.Number({ minimum: 0 }),
        fiber: t.Optional(t.Number({ minimum: 0 })),
        sugar: t.Optional(t.Number({ minimum: 0 })),
        sodium: t.Optional(t.Number({ minimum: 0 })),
        barcode: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/favorite",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const food = await prisma.food.findUnique({
        where: { id: params.id },
      });

      if (!food) {
        set.status = 404;
        return { message: "Food not found" };
      }

      await prisma.userFoodFavorite.upsert({
        where: {
          userId_foodId: {
            userId: session.user.id,
            foodId: params.id,
          },
        },
        create: {
          userId: session.user.id,
          foodId: params.id,
        },
        update: {},
      });

      return { message: "Food favorited" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.food.findUnique({
        where: { id: params.id },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Food not found" };
      }

      const food = await prisma.food.update({
        where: { id: params.id },
        data: body,
        include: {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true },
          },
          foodLogs: {
            where: {
              foodLog: { userId: session.user.id },
            },
            select: { loggedAt: true },
            orderBy: { loggedAt: "desc" },
          },
        },
      });

      return { food: serializeFood(food) };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        brand: t.Optional(t.String()),
        servingSize: t.Optional(t.Number({ minimum: 0 })),
        servingUnit: t.Optional(t.String()),
        calories: t.Optional(t.Number({ minimum: 0 })),
        protein: t.Optional(t.Number({ minimum: 0 })),
        carbs: t.Optional(t.Number({ minimum: 0 })),
        fat: t.Optional(t.Number({ minimum: 0 })),
        fiber: t.Optional(t.Number({ minimum: 0 })),
        sugar: t.Optional(t.Number({ minimum: 0 })),
        sodium: t.Optional(t.Number({ minimum: 0 })),
        barcode: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/:id/favorite",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const favorite = await prisma.userFoodFavorite.findUnique({
        where: {
          userId_foodId: {
            userId: session.user.id,
            foodId: params.id,
          },
        },
      });

      if (!favorite) {
        set.status = 404;
        return { message: "Favorite not found" };
      }

      await prisma.userFoodFavorite.delete({
        where: { id: favorite.id },
      });

      return { message: "Food removed from favorites" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.food.findUnique({
        where: { id: params.id },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Food not found" };
      }

      await prisma.food.delete({
        where: { id: params.id },
      });

      return { message: "Food deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
