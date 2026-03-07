import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const goalsRoutes = new Elysia({ prefix: "/goals" })
  .get(
    "/",
    async ({ query }) => {
      const { userId, status } = query;

      const goals = await prisma.goal.findMany({
        where: {
          userId,
          status: status || undefined,
        },
        orderBy: { createdAt: "desc" },
      });

      return { goals };
    },
    {
      query: t.Object({
        userId: t.String(),
        status: t.Optional(
          t.Union([
            t.Literal("ACTIVE"),
            t.Literal("COMPLETED"),
            t.Literal("CANCELLED"),
          ])
        ),
      }),
    }
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const goal = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!goal) {
        set.status = 404;
        return { message: "Goal not found" };
      }

      return { goal };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const goal = await prisma.goal.create({
        data: {
          userId: body.userId,
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
        userId: t.String(),
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
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const existing = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Goal not found" };
      }

      const goal = await prisma.goal.update({
        where: { id: params.id },
        data: {
          targetValue: body.targetValue,
          currentValue: body.currentValue,
          status: body.status,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      });

      return { goal };
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
          ])
        ),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const existing = await prisma.goal.findUnique({
        where: { id: params.id },
      });

      if (!existing) {
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
    }
  );
