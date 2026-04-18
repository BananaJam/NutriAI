import { Elysia, t } from "elysia";
import { buildGoalSummary, isAutoTrackedGoal } from "@/lib/goals";
import { buildRangeStats, deriveGoalProgress } from "@/lib/nutrition-analytics";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

async function getGoalContext(userId: string) {
  const [profile, logs] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        weight: true,
        targetCalories: true,
        targetProtein: true,
        targetCarbs: true,
        targetFat: true,
      },
    }),
    prisma.foodLog.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
      orderBy: { date: "asc" },
      take: 30,
    }),
  ]);

  return {
    profile,
    stats: buildRangeStats(logs, profile),
  };
}

async function enrichGoal(
  goal: {
    type:
      | "WEIGHT_LOSS"
      | "WEIGHT_GAIN"
      | "CALORIE_TARGET"
      | "PROTEIN_TARGET"
      | "WATER_INTAKE"
      | "CUSTOM";
    currentValue: number;
    targetValue: number;
  },
  userId: string,
) {
  const context = await getGoalContext(userId);

  return {
    ...goal,
    currentValue: deriveGoalProgress(goal, context),
    derivedProgress: isAutoTrackedGoal(goal.type),
  };
}

export const goalsRoutes = new Elysia({ prefix: "/goals" })
  .get(
    "/",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const { status, type, derivedOnly } = query;

      const goals = await prisma.goal.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
      });

      const context = await getGoalContext(session.user.id);
      const enrichedGoals = goals.map((goal) => ({
        ...goal,
        currentValue: deriveGoalProgress(goal, context),
        derivedProgress: isAutoTrackedGoal(goal.type),
      }));

      const filteredGoals = enrichedGoals.filter((goal) => {
        if (status && goal.status !== status) return false;
        if (type && goal.type !== type) return false;
        if (derivedOnly && !goal.derivedProgress) return false;
        return true;
      });

      return {
        goals: filteredGoals,
        summary: buildGoalSummary(enrichedGoals),
        appliedFilters: {
          status: status ?? null,
          type: type ?? null,
          derivedOnly: derivedOnly ?? false,
        },
      };
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal("ACTIVE"),
            t.Literal("COMPLETED"),
            t.Literal("CANCELLED"),
          ]),
        ),
        type: t.Optional(
          t.Union([
            t.Literal("WEIGHT_LOSS"),
            t.Literal("WEIGHT_GAIN"),
            t.Literal("CALORIE_TARGET"),
            t.Literal("PROTEIN_TARGET"),
            t.Literal("WATER_INTAKE"),
            t.Literal("CUSTOM"),
          ]),
        ),
        derivedOnly: t.Optional(t.Boolean()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const goal = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!goal || goal.userId !== session.user.id) {
        set.status = 404;
        return { message: "Goal not found" };
      }

      return { goal: await enrichGoal(goal, session.user.id) };
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

      const goal = await prisma.goal.create({
        data: {
          userId: session.user.id,
          type: body.type,
          targetValue: body.targetValue,
          unit: body.unit,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
        },
      });

      return { goal };
    },
    {
      body: t.Object({
        type: t.Union([
          t.Literal("WEIGHT_LOSS"),
          t.Literal("WEIGHT_GAIN"),
          t.Literal("CALORIE_TARGET"),
          t.Literal("PROTEIN_TARGET"),
          t.Literal("WATER_INTAKE"),
          t.Literal("CUSTOM"),
        ]),
        targetValue: t.Number(),
        unit: t.String(),
        startDate: t.String(),
        endDate: t.Optional(t.String()),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.userId !== session.user.id) {
        set.status = 404;
        return { message: "Goal not found" };
      }

      const goal = await prisma.goal.update({
        where: { id: params.id },
        data: {
          targetValue: body.targetValue,
          currentValue:
            existing.type === "CUSTOM" || existing.type === "WATER_INTAKE"
              ? body.currentValue
              : undefined,
          status: body.status,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      });

      return { goal: await enrichGoal(goal, session.user.id) };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        targetValue: t.Optional(t.Number()),
        currentValue: t.Optional(t.Number()),
        status: t.Optional(
          t.Union([
            t.Literal("ACTIVE"),
            t.Literal("COMPLETED"),
            t.Literal("CANCELLED"),
          ]),
        ),
        endDate: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.userId !== session.user.id) {
        set.status = 404;
        return { message: "Goal not found" };
      }

      await prisma.goal.delete({
        where: { id: params.id },
      });

      return { message: "Goal deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
