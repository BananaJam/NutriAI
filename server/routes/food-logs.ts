import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const foodLogsRoutes = new Elysia({ prefix: "/food-logs" })
  .get(
    "/",
    async ({ query }) => {
      const { userId, startDate, endDate } = query;

      const logs = await prisma.foodLog.findMany({
        where: {
          userId,
          date: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });

      return { logs };
    },
    {
      query: t.Object({
        userId: t.String(),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:date",
    async ({ params, query, set }) => {
      const { userId } = query;
      const date = new Date(params.date);

      const log = await prisma.foodLog.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        include: {
          items: {
            include: {
              food: true,
            },
            orderBy: { loggedAt: "asc" },
          },
        },
      });

      if (!log) {
        set.status = 404;
        return { message: "Food log not found for this date" };
      }

      const totals = log.items.reduce(
        (acc, item) => {
          const multiplier = item.servings;
          return {
            calories: acc.calories + item.food.calories * multiplier,
            protein: acc.protein + item.food.protein * multiplier,
            carbs: acc.carbs + item.food.carbs * multiplier,
            fat: acc.fat + item.food.fat * multiplier,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return { log, totals };
    },
    {
      params: t.Object({
        date: t.String(),
      }),
      query: t.Object({
        userId: t.String(),
      }),
    }
  )
  .post(
    "/:date/items",
    async ({ params, query, body }) => {
      const { userId } = query;
      const date = new Date(params.date);

      const log = await prisma.foodLog.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        create: {
          userId,
          date,
        },
        update: {},
      });

      const item = await prisma.foodLogItem.create({
        data: {
          foodLogId: log.id,
          foodId: body.foodId,
          mealType: body.mealType,
          servings: body.servings ?? 1,
          notes: body.notes,
        },
        include: {
          food: true,
        },
      });

      return { item };
    },
    {
      params: t.Object({
        date: t.String(),
      }),
      query: t.Object({
        userId: t.String(),
      }),
      body: t.Object({
        foodId: t.String(),
        mealType: t.Union([
          t.Literal("BREAKFAST"),
          t.Literal("LUNCH"),
          t.Literal("DINNER"),
          t.Literal("SNACK"),
        ]),
        servings: t.Optional(t.Number({ minimum: 0.1, default: 1 })),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/items/:itemId",
    async ({ params, set }) => {
      const existing = await prisma.foodLogItem.findUnique({
        where: { id: params.itemId },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Food log item not found" };
      }

      await prisma.foodLogItem.delete({
        where: { id: params.itemId },
      });

      return { message: "Food log item deleted successfully" };
    },
    {
      params: t.Object({
        itemId: t.String(),
      }),
    }
  );
