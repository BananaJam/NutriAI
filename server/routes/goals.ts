import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

export const goalsRoutes = new Elysia({ prefix: "/goals" })
  .get(
    "/",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const { status } = query;

      const goals = await prisma.goal.findMany({
        where: {
          userId: session.user.id,
          status: status || undefined,
        },
        orderBy: { createdAt: "desc" },
      });

      return { goals };
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

      return { goal };
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
