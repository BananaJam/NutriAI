import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const profileRoutes = new Elysia({ prefix: "/profile" })
  .get(
    "/:userId",
    async ({ params, set }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: params.userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!profile) {
        set.status = 404;
        return { message: "Profile not found" };
      }

      return { profile };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
    }
  )
  .put(
    "/:userId",
    async ({ params, body }) => {
      const profile = await prisma.userProfile.upsert({
        where: { userId: params.userId },
        create: {
          userId: params.userId,
          ...body,
          dateOfBirth: body.dateOfBirth
            ? new Date(body.dateOfBirth)
            : undefined,
        },
        update: {
          ...body,
          dateOfBirth: body.dateOfBirth
            ? new Date(body.dateOfBirth)
            : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return { profile };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      body: t.Object({
        dateOfBirth: t.Optional(t.String()),
        gender: t.Optional(
          t.Union([t.Literal("MALE"), t.Literal("FEMALE"), t.Literal("OTHER")])
        ),
        height: t.Optional(t.Number({ minimum: 0 })),
        weight: t.Optional(t.Number({ minimum: 0 })),
        activityLevel: t.Optional(
          t.Union([
            t.Literal("SEDENTARY"),
            t.Literal("LIGHT"),
            t.Literal("MODERATE"),
            t.Literal("ACTIVE"),
            t.Literal("VERY_ACTIVE"),
          ])
        ),
        targetCalories: t.Optional(t.Number({ minimum: 0 })),
        targetProtein: t.Optional(t.Number({ minimum: 0 })),
        targetCarbs: t.Optional(t.Number({ minimum: 0 })),
        targetFat: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )
  .get(
    "/:userId/stats",
    async ({ params, query }) => {
      const { startDate, endDate } = query;

      const logs = await prisma.foodLog.findMany({
        where: {
          userId: params.userId,
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
        orderBy: { date: "asc" },
      });

      const dailyTotals = logs.map((log) => {
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

        return {
          date: log.date.toISOString().split("T")[0],
          ...totals,
        };
      });

      const daysLogged = dailyTotals.length;
      const averages =
        daysLogged > 0
          ? {
              calories:
                dailyTotals.reduce((sum, d) => sum + d.calories, 0) / daysLogged,
              protein:
                dailyTotals.reduce((sum, d) => sum + d.protein, 0) / daysLogged,
              carbs:
                dailyTotals.reduce((sum, d) => sum + d.carbs, 0) / daysLogged,
              fat: dailyTotals.reduce((sum, d) => sum + d.fat, 0) / daysLogged,
            }
          : { calories: 0, protein: 0, carbs: 0, fat: 0 };

      return { dailyTotals, averages, daysLogged };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  );
