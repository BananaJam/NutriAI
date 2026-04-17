import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const foodsRoutes = new Elysia({ prefix: "/foods" })
  .get(
    "/",
    async ({ query }) => {
      const { search, limit = 20, offset = 0 } = query;

      const foods = await prisma.food.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { brand: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        take: limit,
        skip: offset,
        orderBy: { name: "asc" },
      });

      return { foods };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number({ default: 20 })),
        offset: t.Optional(t.Number({ default: 0 })),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const food = await prisma.food.findUnique({
        where: { id: params.id },
      });

      if (!food) {
        set.status = 404;
        return { message: "Food not found" };
      }

      return { food };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/",
    async ({ body }) => {
      const food = await prisma.food.create({
        data: body,
      });

      return { food };
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
  .put(
    "/:id",
    async ({ params, body, set }) => {
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
      });

      return { food };
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
    "/:id",
    async ({ params, set }) => {
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
