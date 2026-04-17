import { Elysia, t } from "elysia";
import { buildRangeStats } from "@/lib/nutrition-analytics";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

export const profileRoutes = new Elysia({ prefix: "/profile" })
  .get(
    "/",
    async ({ request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const profile = await prisma.userProfile.findUnique({
        where: { userId: session.user.id },
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
    {},
  )
  .put(
    "/",
    async ({ request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const profile = await prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
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
      body: t.Object({
        dateOfBirth: t.Optional(t.String()),
        gender: t.Optional(
          t.Union([t.Literal("MALE"), t.Literal("FEMALE"), t.Literal("OTHER")]),
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
          ]),
        ),
        targetCalories: t.Optional(t.Number({ minimum: 0 })),
        targetProtein: t.Optional(t.Number({ minimum: 0 })),
        targetCarbs: t.Optional(t.Number({ minimum: 0 })),
        targetFat: t.Optional(t.Number({ minimum: 0 })),
      }),
    },
  )
  .get(
    "/stats",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const { startDate, endDate } = query;

      const logs = await prisma.foodLog.findMany({
        where: {
          userId: session.user.id,
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

      const profile = await prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          targetCalories: true,
          targetProtein: true,
          targetCarbs: true,
          targetFat: true,
        },
      });

      return buildRangeStats(logs, profile);
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    },
  );
