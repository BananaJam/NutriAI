import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

function getDayOfWeekFromDate(date: Date) {
  return date.getUTCDay();
}

export const mealPlansRoutes = new Elysia({ prefix: "/meal-plans" })
  .get(
    "/",
    async ({ request, query, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const { active } = query;

      const plans = await prisma.mealPlan.findMany({
        where: {
          userId: session.user.id,
          isActive: active !== undefined ? active : undefined,
        },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      });

      return { plans };
    },
    {
      query: t.Object({
        active: t.Optional(t.Boolean()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const plan = await prisma.mealPlan.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              food: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
          },
        },
      });

      if (!plan || plan.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan not found" };
      }

      return { plan };
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

      const plan = await prisma.mealPlan.create({
        data: {
          userId: session.user.id,
          name: body.name,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
        },
      });

      return { plan };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        startDate: t.String(),
        endDate: t.String(),
      }),
    },
  )
  .post(
    "/:id/items",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const plan = await prisma.mealPlan.findUnique({
        where: { id: params.id },
      });

      if (!plan || plan.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan not found" };
      }

      const item = await prisma.mealPlanItem.create({
        data: {
          mealPlanId: params.id,
          foodId: body.foodId,
          dayOfWeek: body.dayOfWeek,
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
        id: t.String(),
      }),
      body: t.Object({
        foodId: t.String(),
        dayOfWeek: t.Number({ minimum: 0, maximum: 6 }),
        mealType: t.Union([
          t.Literal("BREAKFAST"),
          t.Literal("LUNCH"),
          t.Literal("DINNER"),
          t.Literal("SNACK"),
        ]),
        servings: t.Optional(t.Number({ minimum: 0.1, default: 1 })),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/apply",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const plan = await prisma.mealPlan.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });

      if (!plan || plan.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan not found" };
      }

      const targetDate = new Date(body.date);
      const selectedDay = body.dayOfWeek ?? getDayOfWeekFromDate(targetDate);
      const matchingItems = plan.items.filter(
        (item) =>
          item.dayOfWeek === selectedDay &&
          (!body.mealType || item.mealType === body.mealType),
      );

      if (!matchingItems.length) {
        set.status = 400;
        return { message: "No meal plan items match the selected filters" };
      }

      const log = await prisma.foodLog.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: targetDate,
          },
        },
        create: {
          userId: session.user.id,
          date: targetDate,
        },
        update: {},
      });

      const items = await prisma.$transaction(
        matchingItems.map((item) =>
          prisma.foodLogItem.create({
            data: {
              foodLogId: log.id,
              foodId: item.foodId,
              mealType: item.mealType,
              servings: item.servings,
              notes: item.notes,
            },
            include: {
              food: true,
            },
          }),
        ),
      );

      return {
        message: "Meal plan applied successfully",
        appliedCount: items.length,
        itemIds: items.map((item) => item.id),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        date: t.String(),
        dayOfWeek: t.Optional(t.Number({ minimum: 0, maximum: 6 })),
        mealType: t.Optional(
          t.Union([
            t.Literal("BREAKFAST"),
            t.Literal("LUNCH"),
            t.Literal("DINNER"),
            t.Literal("SNACK"),
          ]),
        ),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.mealPlan.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan not found" };
      }

      const plan = await prisma.mealPlan.update({
        where: { id: params.id },
        data: {
          name: body.name,
          isActive: body.isActive,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      });

      return { plan };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        isActive: t.Optional(t.Boolean()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.mealPlan.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan not found" };
      }

      await prisma.mealPlan.delete({
        where: { id: params.id },
      });

      return { message: "Meal plan deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .delete(
    "/items/:itemId",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const existing = await prisma.mealPlanItem.findUnique({
        where: { id: params.itemId },
        include: {
          mealPlan: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!existing || existing.mealPlan.userId !== session.user.id) {
        set.status = 404;
        return { message: "Meal plan item not found" };
      }

      await prisma.mealPlanItem.delete({
        where: { id: params.itemId },
      });

      return { message: "Meal plan item deleted successfully" };
    },
    {
      params: t.Object({
        itemId: t.String(),
      }),
    },
  );
