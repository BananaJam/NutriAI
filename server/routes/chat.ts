import { Elysia, t } from "elysia";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool, jsonSchema } from "ai";

import { prisma } from "../lib/prisma";

type SearchFoodsParams = {
  query: string;
  limit?: number;
};

type LogFoodParams = {
  userId: string;
  date: string;
  foodId: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  servings?: number;
};

type GetDailyLogParams = {
  userId: string;
  date: string;
};

type GetUserParams = {
  userId: string;
};

type GetUserStatsParams = {
  userId: string;
  startDate?: string;
  endDate?: string;
};

type CalculateMacrosParams = {
  weight: number;
  height: number;
  age: number;
  gender: "MALE" | "FEMALE";
  activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
  goal: "LOSE" | "MAINTAIN" | "GAIN";
};

type FoodListResult = Awaited<ReturnType<typeof prisma.food.findMany>>;
type LogFoodResult = Awaited<ReturnType<typeof prisma.foodLogItem.create>>;
type FoodLogResult =
  | {
      log: NonNullable<
        Awaited<ReturnType<typeof prisma.foodLog.findUnique>>
      >;
      totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }
  | { message: string };
type UserProfileResult =
  | NonNullable<Awaited<ReturnType<typeof prisma.userProfile.findUnique>>>
  | { message: string };
type UserStatsResult = {
  dailyTotals: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  daysLogged: number;
};
type ActiveGoalsResult = Awaited<ReturnType<typeof prisma.goal.findMany>>;
type MacroCalculationResult = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    protein: number;
    fat: number;
    carbs: number;
  };
};

const nutritionTools = {
  searchFoods: tool({
    description: "Search for foods in the database by name or brand",
    parameters: jsonSchema<SearchFoodsParams>({
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for food name or brand",
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 10,
        },
      },
      required: ["query"],
      additionalProperties: false,
    }),
    execute: async ({ query, limit = 10 }: SearchFoodsParams): Promise<FoodListResult> => {
      const foods = await prisma.food.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { name: "asc" },
      });
      return foods;
    },
  }),

  logFood: tool({
    description: "Log a food item to the user's daily food log",
    parameters: jsonSchema<LogFoodParams>({
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        date: {
          type: "string",
          description: "The date in YYYY-MM-DD format",
        },
        foodId: {
          type: "string",
          description: "The food ID to log",
        },
        mealType: {
          type: "string",
          description: "The meal type",
          enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"],
        },
        servings: {
          type: "number",
          description: "Number of servings",
          default: 1,
        },
      },
      required: ["userId", "date", "foodId", "mealType"],
      additionalProperties: false,
    }),
    execute: async (
      { userId, date, foodId, mealType, servings = 1 }: LogFoodParams,
    ): Promise<LogFoodResult> => {
      const log = await prisma.foodLog.upsert({
        where: {
          userId_date: {
            userId,
            date: new Date(date),
          },
        },
        create: {
          userId,
          date: new Date(date),
        },
        update: {},
      });

      const item = await prisma.foodLogItem.create({
        data: {
          foodLogId: log.id,
          foodId,
          mealType,
          servings,
        },
        include: {
          food: true,
        },
      });

      return item;
    },
  }),

  getDailyLog: tool({
    description:
      "Get the user's food log for a specific date with nutritional totals",
    parameters: jsonSchema<GetDailyLogParams>({
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        date: {
          type: "string",
          description: "The date in YYYY-MM-DD format",
        },
      },
      required: ["userId", "date"],
      additionalProperties: false,
    }),
    execute: async ({ userId, date }: GetDailyLogParams): Promise<FoodLogResult> => {
      const log = await prisma.foodLog.findUnique({
        where: {
          userId_date: {
            userId,
            date: new Date(date),
          },
        },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });

      if (!log) {
        return { message: "No food log found for this date" };
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
  }),

  getUserProfile: tool({
    description: "Get the user's profile including nutritional targets",
    parameters: jsonSchema<GetUserParams>({
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
      },
      required: ["userId"],
      additionalProperties: false,
    }),
    execute: async ({ userId }: GetUserParams): Promise<UserProfileResult> => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!profile) {
        return { message: "Profile not found" };
      }

      return profile;
    },
  }),

  getUserStats: tool({
    description: "Get the user's nutritional statistics for a date range",
    parameters: jsonSchema<GetUserStatsParams>({
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["userId"],
      additionalProperties: false,
    }),
    execute: async ({ userId, startDate, endDate }: GetUserStatsParams): Promise<UserStatsResult> => {
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
  }),

  getActiveGoals: tool({
    description: "Get the user's active goals",
    parameters: jsonSchema<GetUserParams>({
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
      },
      required: ["userId"],
      additionalProperties: false,
    }),
    execute: async ({ userId }: GetUserParams): Promise<ActiveGoalsResult> => {
      const goals = await prisma.goal.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
      });
      return goals;
    },
  }),

  calculateMacros: tool({
    description:
      "Calculate recommended daily macronutrients based on user stats and goals",
    parameters: jsonSchema<CalculateMacrosParams>({
      type: "object",
      properties: {
        weight: {
          type: "number",
          description: "Weight in kg",
        },
        height: {
          type: "number",
          description: "Height in cm",
        },
        age: {
          type: "number",
          description: "Age in years",
        },
        gender: {
          type: "string",
          description: "Gender",
          enum: ["MALE", "FEMALE"],
        },
        activityLevel: {
          type: "string",
          description: "Activity level",
          enum: ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"],
        },
        goal: {
          type: "string",
          description: "Weight goal",
          enum: ["LOSE", "MAINTAIN", "GAIN"],
        },
      },
      required: ["weight", "height", "age", "gender", "activityLevel", "goal"],
      additionalProperties: false,
    }),
    execute: async (
      { weight, height, age, gender, activityLevel, goal }: CalculateMacrosParams,
    ): Promise<MacroCalculationResult> => {
      const bmr =
        gender === "MALE"
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;

      const activityMultipliers: Record<string, number> = {
        SEDENTARY: 1.2,
        LIGHT: 1.375,
        MODERATE: 1.55,
        ACTIVE: 1.725,
        VERY_ACTIVE: 1.9,
      };

      const tdee = bmr * activityMultipliers[activityLevel];

      let targetCalories = tdee;
      if (goal === "LOSE") targetCalories -= 500;
      if (goal === "GAIN") targetCalories += 300;

      const protein = weight * 2;
      const fat = (targetCalories * 0.25) / 9;
      const carbs = (targetCalories - protein * 4 - fat * 9) / 4;

      return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        targetCalories: Math.round(targetCalories),
        macros: {
          protein: Math.round(protein),
          fat: Math.round(fat),
          carbs: Math.round(carbs),
        },
      };
    },
  }),
};

export async function handleChatRequest(messages: unknown[], userId?: string) {
  const normalizeMessageContent = (content: unknown) => {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === "string") {
          return { type: "text", text: part };
        }

        if (
          part &&
          typeof part === "object" &&
          "type" in (part as Record<string, unknown>)
        ) {
          return part;
        }

        return { type: "text", text: JSON.stringify(part) };
      });
    }

    if (content && typeof content === "object") {
      const typedContent = content as Record<string, unknown>;
      if ("type" in typedContent) {
        return [typedContent];
      }
      if (typeof typedContent.text === "string") {
        return typedContent.text;
      }
    }

    if (typeof content === "number" || typeof content === "boolean") {
      return String(content);
    }

    if (content == null) {
      return "";
    }

    return JSON.stringify(content);
  };

  const normalizedMessages = Array.isArray(messages)
    ? messages.map((message) => {
        if (!message || typeof message !== "object") {
          return {
            role: "user",
            content: normalizeMessageContent(message),
          };
        }

        const typedMessage = message as Record<string, unknown>;
        return {
          ...typedMessage,
          content: normalizeMessageContent(typedMessage.content),
        };
      })
    : [];

  const modelProvider = process.env.AI_PROVIDER || "openai";
  const model =
    modelProvider === "anthropic"
      ? anthropic("claude-sonnet-4-20250514")
      : openai("gpt-4o");

  const result = await streamText({
    model,
    system: `You are a helpful nutrition assistant for a meal planning and tracking application.
Your role is to help users:
- Track their daily food intake
- Plan meals and suggest healthy options
- Calculate nutritional information
- Provide personalized recommendations based on their goals
- Answer questions about nutrition and healthy eating

When users want to log food, search for foods first to find the correct food ID, then log it.
Always be encouraging and supportive about their health journey.
The current user ID is: ${userId || "demo-user"}
Today's date is: ${new Date().toISOString().split("T")[0]}`,
    messages: normalizedMessages as Parameters<typeof streamText>[0]["messages"],
    tools: nutritionTools,
    maxToolRoundtrips: 5,
  });

  return result;
}

export const chatRoutes = new Elysia({ prefix: "/chat" }).post(
  "/",
  async ({ body }) => {
    const { messages, userId } = body;
    const result = await handleChatRequest(messages, userId);
    return result.toDataStreamResponse();
  },
  {
    body: t.Object(
      {
        messages: t.Array(
          t.Object(
            {
              role: t.Union([
                t.Literal("user"),
                t.Literal("assistant"),
                t.Literal("system"),
                t.Literal("tool"),
              ]),
              content: t.Unknown(),
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              toolCallId: t.Optional(t.String()),
            },
            { additionalProperties: true }
          )
        ),
        userId: t.Optional(t.String()),
        input: t.Optional(t.String()),
        id: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
        temperature: t.Optional(t.Number()),
        topP: t.Optional(t.Number()),
        maxTokens: t.Optional(t.Number()),
        stop: t.Optional(t.Union([t.String(), t.Array(t.String())])),
        toolChoice: t.Optional(t.Unknown()),
      },
      { additionalProperties: true }
    ),
  }
);
