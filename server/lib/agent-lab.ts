import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool as langchainTool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import {
  Agent,
  tool as openAiAgentTool,
  run as runOpenAiAgent,
} from "@openai/agents";
import { tool as aiTool, generateText, jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";
import { z } from "zod";
import type {
  AgentLabRun,
  AgentLabRunStatus,
  AgentLabScenarioId,
  AgentSdkId,
} from "@/lib/agent-lab";
import { AGENT_LAB_SCENARIOS } from "@/lib/agent-lab";
import { buildFoodCatalogWhere } from "@/lib/food-catalog";
import { buildRangeStats, sumNutritionTotals } from "@/lib/nutrition-analytics";
import type { Prisma } from "../../generated/prisma";
import { prisma } from "./prisma";

const agentLabSdkToPrisma = {
  "vercel-ai": "VERCEL_AI",
  "openai-agents": "OPENAI_AGENTS",
  langgraph: "LANGGRAPH",
} as const;

const prismaSdkToAgentLab = {
  VERCEL_AI: "vercel-ai",
  OPENAI_AGENTS: "openai-agents",
  LANGGRAPH: "langgraph",
} as const;

const agentLabScenarioToPrisma = {
  "high-protein-breakfast": "HIGH_PROTEIN_BREAKFAST",
  "log-recent-lunch": "LOG_RECENT_LUNCH",
  "weekly-nutrition-review": "WEEKLY_NUTRITION_REVIEW",
  "calculate-macros": "CALCULATE_MACROS",
} as const;

const prismaScenarioToAgentLab = {
  HIGH_PROTEIN_BREAKFAST: "high-protein-breakfast",
  LOG_RECENT_LUNCH: "log-recent-lunch",
  WEEKLY_NUTRITION_REVIEW: "weekly-nutrition-review",
  CALCULATE_MACROS: "calculate-macros",
} as const;

const prismaStatusToAgentLab = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const satisfies Record<string, AgentLabRunStatus>;

const prismaToolStateToAgentLab = {
  CALL: "call",
  RESULT: "result",
  ERROR: "error",
} as const;

const defaultAnthropicModel =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const mealTypeEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
const genderEnum = z.enum(["MALE", "FEMALE"]);
const activityLevelEnum = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);
const macroGoalEnum = z.enum(["LOSE", "MAINTAIN", "GAIN"]);

const searchFoodsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(25).default(10),
});

const logFoodSchema = z.object({
  date: z.string(),
  foodId: z.string(),
  mealType: mealTypeEnum,
  servings: z.number().positive().default(1),
});

const getDailyLogSchema = z.object({
  date: z.string(),
});

const getUserStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const calculateMacrosSchema = z.object({
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().positive(),
  gender: genderEnum,
  activityLevel: activityLevelEnum,
  goal: macroGoalEnum,
});

type ToolRecorder = (event: {
  toolName: string;
  state: "call" | "result" | "error";
  args?: unknown;
  result?: unknown;
}) => void;

type DomainToolDefinition<TInput> = {
  description: string;
  zodSchema: z.ZodType<TInput>;
  jsonSchema: JSONSchema7;
  execute: (input: TInput) => Promise<unknown>;
};

type DomainToolMap = ReturnType<typeof createDomainToolDefinitions>;

type AdapterExecutionResult = {
  response: string;
  rawTrace: unknown;
};

function ensureOpenAiApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the agent lab.");
  }
}

function getAgentLabProvider() {
  return process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
}

function getAgentLabModelLabel() {
  return getAgentLabProvider() === "anthropic"
    ? defaultAnthropicModel
    : "gpt-4o";
}

function ensureAgentLabApiKey() {
  if (getAgentLabProvider() === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for the agent lab.");
    }
    return;
  }

  ensureOpenAiApiKey();
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : JSON.stringify(error);
}

function toJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) => {
        if (currentValue instanceof Date) {
          return currentValue.toISOString();
        }

        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
          };
        }

        if (typeof currentValue === "bigint") {
          return currentValue.toString();
        }

        if (typeof currentValue === "function") {
          return `[function ${currentValue.name || "anonymous"}]`;
        }

        return currentValue;
      }),
    );
  } catch {
    return String(value);
  }
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in (part as Record<string, unknown>) &&
          typeof (part as Record<string, unknown>).text === "string"
        ) {
          return String((part as Record<string, unknown>).text);
        }

        return "";
      })
      .join("");
  }

  if (content && typeof content === "object") {
    const typedContent = content as Record<string, unknown>;

    if (typeof typedContent.text === "string") {
      return typedContent.text;
    }
  }

  return content == null ? "" : String(content);
}

function extractFinalText(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }

  if (
    output &&
    typeof output === "object" &&
    "text" in (output as Record<string, unknown>) &&
    typeof (output as Record<string, unknown>).text === "string"
  ) {
    return String((output as Record<string, unknown>).text);
  }

  return output == null ? "" : JSON.stringify(toJsonValue(output));
}

async function getFoodCatalogContext(userId: string) {
  const [favoriteFoods, recentFoodItems, highProteinFoods] = await Promise.all([
    prisma.userFoodFavorite.findMany({
      where: { userId },
      include: {
        food: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.foodLogItem.findMany({
      where: {
        foodLog: {
          userId,
        },
      },
      include: {
        food: true,
      },
      orderBy: { loggedAt: "desc" },
      take: 20,
    }),
    prisma.food.findMany({
      where: buildFoodCatalogWhere({ minProtein: 20 }),
      orderBy: [{ protein: "desc" }, { calories: "asc" }],
      take: 5,
    }),
  ]);

  const recentFoods = Array.from(
    new Map(recentFoodItems.map((item) => [item.foodId, item.food])).values(),
  ).slice(0, 5);

  return {
    favorites: favoriteFoods.map((favorite) => favorite.food),
    recentFoods,
    highProteinFoods,
  };
}

async function buildSystemPrompt(userId: string) {
  const [profile, goals, foodCatalogContext] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        activityLevel: true,
        targetCalories: true,
        targetProtein: true,
        targetCarbs: true,
        targetFat: true,
      },
    }),
    prisma.goal.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        type: true,
        targetValue: true,
        unit: true,
      },
      take: 5,
    }),
    getFoodCatalogContext(userId),
  ]);

  const profileContext = profile
    ? `Profile context:
- Weight: ${profile.weight ?? "unknown"} kg
- Height: ${profile.height ?? "unknown"} cm
- Gender: ${profile.gender ?? "unknown"}
- Activity level: ${profile.activityLevel ?? "unknown"}
- Daily targets: calories ${profile.targetCalories ?? "unknown"}, protein ${profile.targetProtein ?? "unknown"}g, carbs ${profile.targetCarbs ?? "unknown"}g, fat ${profile.targetFat ?? "unknown"}g`
    : "Profile context: not configured yet.";

  const goalContext = goals.length
    ? `Active goals:\n${goals
        .map((goal) => `- ${goal.type}: ${goal.targetValue} ${goal.unit}`)
        .join("\n")}`
    : "Active goals: none.";

  const foodContext = `Food catalog context:
- Favorite foods: ${
    foodCatalogContext.favorites.length
      ? foodCatalogContext.favorites
          .map((food) => `${food.name}${food.brand ? ` (${food.brand})` : ""}`)
          .join(", ")
      : "none"
  }
- Recently used foods: ${
    foodCatalogContext.recentFoods.length
      ? foodCatalogContext.recentFoods.map((food) => food.name).join(", ")
      : "none"
  }
- High-protein saved foods: ${
    foodCatalogContext.highProteinFoods.length
      ? foodCatalogContext.highProteinFoods
          .map((food) => `${food.name} (${food.protein}g protein)`)
          .join(", ")
      : "none"
  }`;

  return `You are a helpful nutrition assistant for a meal planning and tracking application.
Your role is to help users:
- Track their daily food intake
- Plan meals and suggest healthy options
- Calculate nutritional information
- Provide personalized recommendations based on their goals
- Answer questions about nutrition and healthy eating

When users want to log food, search for foods first to find the correct food ID, then log it.
Use the available tools when user data is needed, and keep answers practical and concise.
The current user ID is: ${userId}
Today's date is: ${new Date().toISOString().split("T")[0]}

${profileContext}
${goalContext}
${foodContext}`;
}

async function withRecordedTool<TInput>(
  toolName: string,
  input: TInput,
  execute: () => Promise<unknown>,
  recordToolEvent: ToolRecorder,
) {
  recordToolEvent({
    toolName,
    state: "call",
    args: input,
  });

  try {
    const result = await execute();
    recordToolEvent({
      toolName,
      state: "result",
      args: input,
      result,
    });
    return result;
  } catch (error) {
    recordToolEvent({
      toolName,
      state: "error",
      args: input,
      result: serializeError(error),
    });
    throw error;
  }
}

function createDomainToolDefinitions(
  userId: string,
  recordToolEvent: ToolRecorder,
) {
  return {
    searchFoods: {
      description: "Search for foods in the database by name or brand",
      zodSchema: searchFoodsSchema,
      jsonSchema: {
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
      },
      execute: (input: z.infer<typeof searchFoodsSchema>) =>
        withRecordedTool(
          "searchFoods",
          input,
          async () => {
            const foods = await prisma.food.findMany({
              where: {
                OR: [
                  { name: { contains: input.query, mode: "insensitive" } },
                  { brand: { contains: input.query, mode: "insensitive" } },
                ],
              },
              take: input.limit,
              orderBy: { name: "asc" },
            });

            const [favorites, recentFoods] = await Promise.all([
              prisma.userFoodFavorite.findMany({
                where: {
                  userId,
                  foodId: {
                    in: foods.map((food) => food.id),
                  },
                },
                select: {
                  foodId: true,
                },
              }),
              prisma.foodLogItem.findMany({
                where: {
                  foodId: {
                    in: foods.map((food) => food.id),
                  },
                  foodLog: {
                    userId,
                  },
                },
                select: {
                  foodId: true,
                  loggedAt: true,
                },
                orderBy: { loggedAt: "desc" },
              }),
            ]);

            const favoriteIds = new Set(
              favorites.map((favorite) => favorite.foodId),
            );
            const recentByFood = new Map<string, string>();

            for (const item of recentFoods) {
              if (!recentByFood.has(item.foodId)) {
                recentByFood.set(item.foodId, item.loggedAt.toISOString());
              }
            }

            return foods.map((food) => ({
              ...food,
              isFavorite: favoriteIds.has(food.id),
              lastUsedAt: recentByFood.get(food.id) ?? null,
            }));
          },
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<z.infer<typeof searchFoodsSchema>>,
    logFood: {
      description: "Log a food item to the user's daily food log",
      zodSchema: logFoodSchema,
      jsonSchema: {
        type: "object",
        properties: {
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
            enum: mealTypeEnum.options,
          },
          servings: {
            type: "number",
            description: "Number of servings",
            default: 1,
          },
        },
        required: ["date", "foodId", "mealType"],
        additionalProperties: false,
      },
      execute: (input: z.infer<typeof logFoodSchema>) =>
        withRecordedTool(
          "logFood",
          input,
          async () => {
            const log = await prisma.foodLog.upsert({
              where: {
                userId_date: {
                  userId,
                  date: new Date(input.date),
                },
              },
              create: {
                userId,
                date: new Date(input.date),
              },
              update: {},
            });

            return prisma.foodLogItem.create({
              data: {
                foodLogId: log.id,
                foodId: input.foodId,
                mealType: input.mealType,
                servings: input.servings,
              },
              include: {
                food: true,
              },
            });
          },
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<z.infer<typeof logFoodSchema>>,
    getDailyLog: {
      description:
        "Get the user's food log for a specific date with nutritional totals",
      zodSchema: getDailyLogSchema,
      jsonSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date in YYYY-MM-DD format",
          },
        },
        required: ["date"],
        additionalProperties: false,
      },
      execute: (input: z.infer<typeof getDailyLogSchema>) =>
        withRecordedTool(
          "getDailyLog",
          input,
          async () => {
            const log = await prisma.foodLog.findUnique({
              where: {
                userId_date: {
                  userId,
                  date: new Date(input.date),
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

            const totals = sumNutritionTotals(log.items);

            return { log, totals };
          },
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<z.infer<typeof getDailyLogSchema>>,
    getUserProfile: {
      description: "Get the user's profile including nutritional targets",
      zodSchema: z.object({}),
      jsonSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () =>
        withRecordedTool(
          "getUserProfile",
          {},
          async () => {
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
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<Record<string, never>>,
    getUserStats: {
      description: "Get the user's nutritional statistics for a date range",
      zodSchema: getUserStatsSchema,
      jsonSchema: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
        },
        additionalProperties: false,
      },
      execute: (input: z.infer<typeof getUserStatsSchema>) =>
        withRecordedTool(
          "getUserStats",
          input,
          async () => {
            const logs = await prisma.foodLog.findMany({
              where: {
                userId,
                date: {
                  gte: input.startDate ? new Date(input.startDate) : undefined,
                  lte: input.endDate ? new Date(input.endDate) : undefined,
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
              where: { userId },
              select: {
                targetCalories: true,
                targetProtein: true,
                targetCarbs: true,
                targetFat: true,
              },
            });

            return buildRangeStats(logs, profile);
          },
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<z.infer<typeof getUserStatsSchema>>,
    getActiveGoals: {
      description: "Get the user's active goals",
      zodSchema: z.object({}),
      jsonSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () =>
        withRecordedTool(
          "getActiveGoals",
          {},
          async () =>
            prisma.goal.findMany({
              where: {
                userId,
                status: "ACTIVE",
              },
            }),
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<Record<string, never>>,
    calculateMacros: {
      description:
        "Calculate recommended daily macronutrients based on user stats and goals",
      zodSchema: calculateMacrosSchema,
      jsonSchema: {
        type: "object",
        properties: {
          weight: { type: "number", description: "Weight in kg" },
          height: { type: "number", description: "Height in cm" },
          age: { type: "number", description: "Age in years" },
          gender: {
            type: "string",
            description: "Gender",
            enum: genderEnum.options,
          },
          activityLevel: {
            type: "string",
            description: "Activity level",
            enum: activityLevelEnum.options,
          },
          goal: {
            type: "string",
            description: "Weight goal",
            enum: macroGoalEnum.options,
          },
        },
        required: [
          "weight",
          "height",
          "age",
          "gender",
          "activityLevel",
          "goal",
        ],
        additionalProperties: false,
      },
      execute: (input: z.infer<typeof calculateMacrosSchema>) =>
        withRecordedTool(
          "calculateMacros",
          input,
          async () => {
            const bmr =
              input.gender === "MALE"
                ? 10 * input.weight + 6.25 * input.height - 5 * input.age + 5
                : 10 * input.weight + 6.25 * input.height - 5 * input.age - 161;

            const activityMultipliers: Record<string, number> = {
              SEDENTARY: 1.2,
              LIGHT: 1.375,
              MODERATE: 1.55,
              ACTIVE: 1.725,
              VERY_ACTIVE: 1.9,
            };

            const tdee = bmr * activityMultipliers[input.activityLevel];

            let targetCalories = tdee;
            if (input.goal === "LOSE") targetCalories -= 500;
            if (input.goal === "GAIN") targetCalories += 300;

            const protein = input.weight * 2;
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
          recordToolEvent,
        ),
    } satisfies DomainToolDefinition<z.infer<typeof calculateMacrosSchema>>,
  };
}

function createVercelAiTools(domainTools: DomainToolMap) {
  return {
    searchFoods: aiTool({
      description: domainTools.searchFoods.description,
      parameters: jsonSchema(domainTools.searchFoods.jsonSchema),
      execute: async (input) =>
        domainTools.searchFoods.execute(searchFoodsSchema.parse(input)),
    }),
    logFood: aiTool({
      description: domainTools.logFood.description,
      parameters: jsonSchema(domainTools.logFood.jsonSchema),
      execute: async (input) =>
        domainTools.logFood.execute(logFoodSchema.parse(input)),
    }),
    getDailyLog: aiTool({
      description: domainTools.getDailyLog.description,
      parameters: jsonSchema(domainTools.getDailyLog.jsonSchema),
      execute: async (input) =>
        domainTools.getDailyLog.execute(getDailyLogSchema.parse(input)),
    }),
    getUserProfile: aiTool({
      description: domainTools.getUserProfile.description,
      parameters: jsonSchema(domainTools.getUserProfile.jsonSchema),
      execute: async () => domainTools.getUserProfile.execute(),
    }),
    getUserStats: aiTool({
      description: domainTools.getUserStats.description,
      parameters: jsonSchema(domainTools.getUserStats.jsonSchema),
      execute: async (input) =>
        domainTools.getUserStats.execute(getUserStatsSchema.parse(input)),
    }),
    getActiveGoals: aiTool({
      description: domainTools.getActiveGoals.description,
      parameters: jsonSchema(domainTools.getActiveGoals.jsonSchema),
      execute: async () => domainTools.getActiveGoals.execute(),
    }),
    calculateMacros: aiTool({
      description: domainTools.calculateMacros.description,
      parameters: jsonSchema(domainTools.calculateMacros.jsonSchema),
      execute: async (input) =>
        domainTools.calculateMacros.execute(calculateMacrosSchema.parse(input)),
    }),
  };
}

function createOpenAiAgentTools(domainTools: DomainToolMap) {
  return [
    openAiAgentTool({
      name: "searchFoods",
      description: domainTools.searchFoods.description,
      parameters: searchFoodsSchema,
      execute: async (input) =>
        domainTools.searchFoods.execute(searchFoodsSchema.parse(input)),
    }),
    openAiAgentTool({
      name: "logFood",
      description: domainTools.logFood.description,
      parameters: logFoodSchema,
      execute: async (input) =>
        domainTools.logFood.execute(logFoodSchema.parse(input)),
    }),
    openAiAgentTool({
      name: "getDailyLog",
      description: domainTools.getDailyLog.description,
      parameters: getDailyLogSchema,
      execute: async (input) =>
        domainTools.getDailyLog.execute(getDailyLogSchema.parse(input)),
    }),
    openAiAgentTool({
      name: "getUserProfile",
      description: domainTools.getUserProfile.description,
      parameters: z.object({}),
      execute: async () => domainTools.getUserProfile.execute(),
    }),
    openAiAgentTool({
      name: "getUserStats",
      description: domainTools.getUserStats.description,
      parameters: getUserStatsSchema,
      execute: async (input) =>
        domainTools.getUserStats.execute(getUserStatsSchema.parse(input)),
    }),
    openAiAgentTool({
      name: "getActiveGoals",
      description: domainTools.getActiveGoals.description,
      parameters: z.object({}),
      execute: async () => domainTools.getActiveGoals.execute(),
    }),
    openAiAgentTool({
      name: "calculateMacros",
      description: domainTools.calculateMacros.description,
      parameters: calculateMacrosSchema,
      execute: async (input) =>
        domainTools.calculateMacros.execute(calculateMacrosSchema.parse(input)),
    }),
  ];
}

function createLangGraphTools(domainTools: DomainToolMap) {
  return [
    langchainTool(
      async (input) =>
        domainTools.searchFoods.execute(searchFoodsSchema.parse(input)),
      {
        name: "searchFoods",
        description: domainTools.searchFoods.description,
        schema: searchFoodsSchema,
      },
    ),
    langchainTool(
      async (input) => domainTools.logFood.execute(logFoodSchema.parse(input)),
      {
        name: "logFood",
        description: domainTools.logFood.description,
        schema: logFoodSchema,
      },
    ),
    langchainTool(
      async (input) =>
        domainTools.getDailyLog.execute(getDailyLogSchema.parse(input)),
      {
        name: "getDailyLog",
        description: domainTools.getDailyLog.description,
        schema: getDailyLogSchema,
      },
    ),
    langchainTool(async () => domainTools.getUserProfile.execute(), {
      name: "getUserProfile",
      description: domainTools.getUserProfile.description,
      schema: z.object({}),
    }),
    langchainTool(
      async (input) =>
        domainTools.getUserStats.execute(getUserStatsSchema.parse(input)),
      {
        name: "getUserStats",
        description: domainTools.getUserStats.description,
        schema: getUserStatsSchema,
      },
    ),
    langchainTool(async () => domainTools.getActiveGoals.execute(), {
      name: "getActiveGoals",
      description: domainTools.getActiveGoals.description,
      schema: z.object({}),
    }),
    langchainTool(
      async (input) =>
        domainTools.calculateMacros.execute(calculateMacrosSchema.parse(input)),
      {
        name: "calculateMacros",
        description: domainTools.calculateMacros.description,
        schema: calculateMacrosSchema,
      },
    ),
  ];
}

async function executeWithVercelAiSdk(args: {
  userId: string;
  prompt: string;
  systemPrompt: string;
  domainTools: DomainToolMap;
}): Promise<AdapterExecutionResult> {
  const stepTrace: Array<Record<string, unknown>> = [];
  const provider = getAgentLabProvider();
  const model =
    provider === "anthropic"
      ? anthropic(defaultAnthropicModel)
      : openai("gpt-4o");

  const result = await generateText({
    model,
    system: args.systemPrompt,
    prompt: args.prompt,
    tools: createVercelAiTools(args.domainTools),
    maxToolRoundtrips: 5,
    onStepFinish: (step) => {
      stepTrace.push({
        finishReason: step.finishReason,
        text: step.text,
        toolCalls: toJsonValue(step.toolCalls),
        toolResults: toJsonValue(step.toolResults),
      });
    },
  });

  return {
    response: result.text,
    rawTrace: {
      provider: "vercel-ai",
      modelProvider: provider,
      model: getAgentLabModelLabel(),
      finishReason: result.finishReason,
      steps: stepTrace,
    },
  };
}

async function executeWithOpenAiAgents(args: {
  conversationId: string | null;
  prompt: string;
  systemPrompt: string;
  domainTools: DomainToolMap;
}): Promise<AdapterExecutionResult> {
  if (getAgentLabProvider() === "anthropic") {
    throw new Error(
      "OpenAI Agents SDK integration is OpenAI-provider specific in this project and cannot run with ANTHROPIC_API_KEY.",
    );
  }

  const agent = new Agent({
    name: "Nutrition Investigation Agent",
    instructions: args.systemPrompt,
    model: "gpt-4o",
    tools: createOpenAiAgentTools(args.domainTools),
  });

  const result = await runOpenAiAgent(agent, args.prompt, {
    conversationId: args.conversationId ?? undefined,
  });

  return {
    response: extractFinalText(result.finalOutput),
    rawTrace: {
      provider: "openai-agents",
      modelProvider: "openai",
      model: "gpt-4o",
      finalOutput: toJsonValue(result.finalOutput),
      newItems: toJsonValue(result.newItems),
      historyLength: result.history.length,
    },
  };
}

async function executeWithLangGraph(args: {
  conversationId: string | null;
  prompt: string;
  systemPrompt: string;
  domainTools: DomainToolMap;
}): Promise<AdapterExecutionResult> {
  const provider = getAgentLabProvider();
  const llm =
    provider === "anthropic"
      ? new ChatAnthropic({
          model: defaultAnthropicModel,
          temperature: 0,
        })
      : new ChatOpenAI({
          model: "gpt-4o",
          temperature: 0,
        });

  const agent = createReactAgent({
    llm,
    tools: createLangGraphTools(args.domainTools),
    prompt: args.systemPrompt,
    checkpointer: new MemorySaver(),
  });

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: args.prompt }],
    },
    {
      configurable: {
        thread_id: args.conversationId ?? crypto.randomUUID(),
      },
    },
  );

  const messages = Array.isArray((result as Record<string, unknown>).messages)
    ? ((result as Record<string, unknown>).messages as Array<
        Record<string, unknown>
      >)
    : [];

  const lastMessage = messages[messages.length - 1];

  return {
    response: extractTextFromContent(lastMessage?.content),
    rawTrace: {
      provider: "langgraph",
      modelProvider: provider,
      model: getAgentLabModelLabel(),
      messageCount: messages.length,
      messages: messages.map((message) => ({
        type:
          typeof message.getType === "function"
            ? String(message.getType())
            : typeof message._getType === "function"
              ? String(message._getType())
              : typeof message.name === "string"
                ? message.name
                : "message",
        content: extractTextFromContent(message.content),
        toolCalls: toJsonValue(
          "tool_calls" in message ? message.tool_calls : message.toolCalls,
        ),
      })),
    },
  };
}

export async function executeAgentLabRun(args: {
  sdk: AgentSdkId;
  scenarioId: AgentLabScenarioId;
  userId: string;
  conversationId?: string | null;
}) {
  ensureAgentLabApiKey();

  const scenario = AGENT_LAB_SCENARIOS.find(
    (item) => item.id === args.scenarioId,
  );

  if (!scenario) {
    throw new Error("Scenario not found.");
  }

  const toolEvents: Array<{
    toolName: string;
    state: "call" | "result" | "error";
    args?: unknown;
    result?: unknown;
  }> = [];

  const recordToolEvent: ToolRecorder = (event) => {
    toolEvents.push(event);
  };

  const [systemPrompt] = await Promise.all([buildSystemPrompt(args.userId)]);
  const domainTools = createDomainToolDefinitions(args.userId, recordToolEvent);
  const startedAt = Date.now();

  const execution =
    args.sdk === "vercel-ai"
      ? await executeWithVercelAiSdk({
          userId: args.userId,
          prompt: scenario.prompt,
          systemPrompt,
          domainTools,
        })
      : args.sdk === "openai-agents"
        ? await executeWithOpenAiAgents({
            conversationId: args.conversationId ?? null,
            prompt: scenario.prompt,
            systemPrompt,
            domainTools,
          })
        : await executeWithLangGraph({
            conversationId: args.conversationId ?? null,
            prompt: scenario.prompt,
            systemPrompt,
            domainTools,
          });

  return {
    prompt: scenario.prompt,
    response: execution.response,
    latencyMs: Date.now() - startedAt,
    rawTrace: execution.rawTrace,
    toolEvents,
  };
}

export function normalizeAgentLabRun(run: {
  id: string;
  sdk: keyof typeof prismaSdkToAgentLab;
  scenarioId: keyof typeof prismaScenarioToAgentLab;
  conversationId: string | null;
  prompt: string;
  response: string | null;
  status: keyof typeof prismaStatusToAgentLab;
  latencyMs: number | null;
  error: string | null;
  rawTrace: unknown;
  createdAt: Date;
  updatedAt: Date;
  toolEvents: Array<{
    id: string;
    runId: string;
    position: number;
    toolName: string;
    state: keyof typeof prismaToolStateToAgentLab;
    args: unknown;
    result: unknown;
    createdAt: Date;
  }>;
}): AgentLabRun {
  return {
    id: run.id,
    sdk: prismaSdkToAgentLab[run.sdk],
    scenarioId: prismaScenarioToAgentLab[run.scenarioId],
    conversationId: run.conversationId,
    prompt: run.prompt,
    response: run.response,
    status: prismaStatusToAgentLab[run.status],
    latencyMs: run.latencyMs,
    error: run.error,
    rawTrace: run.rawTrace,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    toolEvents: run.toolEvents.map((event) => ({
      id: event.id,
      runId: event.runId,
      position: event.position,
      toolName: event.toolName,
      state: prismaToolStateToAgentLab[event.state],
      args: event.args,
      result: event.result,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export function toPrismaSdk(sdk: AgentSdkId) {
  return agentLabSdkToPrisma[sdk];
}

export function toPrismaScenarioId(scenarioId: AgentLabScenarioId) {
  return agentLabScenarioToPrisma[scenarioId];
}

export function toPrismaToolEvents(
  toolEvents: Array<{
    toolName: string;
    state: "call" | "result" | "error";
    args?: unknown;
    result?: unknown;
  }>,
) {
  const stateMap = {
    call: "CALL",
    result: "RESULT",
    error: "ERROR",
  } as const;

  return toolEvents.map((event, index) => ({
    position: index,
    toolName: event.toolName,
    state: stateMap[event.state],
    args: toJsonValue(event.args) as
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput,
    result: toJsonValue(event.result) as
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput,
  }));
}

export function toStoredTrace(value: unknown) {
  return toJsonValue(value) as
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput;
}
