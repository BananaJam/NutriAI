import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { jsonSchema, streamText, tool } from "ai";
import { Elysia, t } from "elysia";
import { buildRangeStats, sumNutritionTotals } from "@/lib/nutrition-analytics";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

type SearchFoodsParams = {
  query: string;
  limit?: number;
};

type LogFoodParams = {
  date: string;
  foodId: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  servings?: number;
};

type GetDailyLogParams = {
  date: string;
};

type GetUserStatsParams = {
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

function normalizeMessageContent(content: unknown) {
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
}

function extractTextContent(content: unknown) {
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

  if (content == null) {
    return "";
  }

  return String(content);
}

function createNutritionTools(userId: string) {
  return {
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
      execute: async ({ query, limit = 10 }) => {
        return prisma.food.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          orderBy: { name: "asc" },
        });
      },
    }),
    logFood: tool({
      description: "Log a food item to the user's daily food log",
      parameters: jsonSchema<LogFoodParams>({
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
            enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"],
          },
          servings: {
            type: "number",
            description: "Number of servings",
            default: 1,
          },
        },
        required: ["date", "foodId", "mealType"],
        additionalProperties: false,
      }),
      execute: async ({ date, foodId, mealType, servings = 1 }) => {
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

        return prisma.foodLogItem.create({
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
      },
    }),
    getDailyLog: tool({
      description:
        "Get the user's food log for a specific date with nutritional totals",
      parameters: jsonSchema<GetDailyLogParams>({
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date in YYYY-MM-DD format",
          },
        },
        required: ["date"],
        additionalProperties: false,
      }),
      execute: async ({ date }) => {
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

        const totals = sumNutritionTotals(log.items);

        return { log, totals };
      },
    }),
    getUserProfile: tool({
      description: "Get the user's profile including nutritional targets",
      parameters: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => {
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
      }),
      execute: async ({ startDate, endDate }) => {
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
    }),
    getActiveGoals: tool({
      description: "Get the user's active goals",
      parameters: jsonSchema<Record<string, never>>({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => {
        return prisma.goal.findMany({
          where: {
            userId,
            status: "ACTIVE",
          },
        });
      },
    }),
    calculateMacros: tool({
      description:
        "Calculate recommended daily macronutrients based on user stats and goals",
      parameters: jsonSchema<CalculateMacrosParams>({
        type: "object",
        properties: {
          weight: { type: "number", description: "Weight in kg" },
          height: { type: "number", description: "Height in cm" },
          age: { type: "number", description: "Age in years" },
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
        required: [
          "weight",
          "height",
          "age",
          "gender",
          "activityLevel",
          "goal",
        ],
        additionalProperties: false,
      }),
      execute: async ({ weight, height, age, gender, activityLevel, goal }) => {
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
}

function buildConversationTitle(message: string) {
  const cleaned = message.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New conversation";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

export async function handleChatRequest(
  messages: unknown[],
  userId: string,
  onFinish?: (result: {
    text: string;
    toolCalls: unknown[];
    toolResults: unknown[];
  }) => Promise<void>,
) {
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
  const [profile, goals] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
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
  ]);

  const profileContext = profile
    ? `Profile context:
- Weight: ${profile.weight ?? "unknown"} kg
- Activity level: ${profile.activityLevel ?? "unknown"}
- Daily targets: calories ${profile.targetCalories ?? "unknown"}, protein ${profile.targetProtein ?? "unknown"}g, carbs ${profile.targetCarbs ?? "unknown"}g, fat ${profile.targetFat ?? "unknown"}g`
    : "Profile context: not configured yet.";
  const goalContext = goals.length
    ? `Active goals:\n${goals
        .map((goal) => `- ${goal.type}: ${goal.targetValue} ${goal.unit}`)
        .join("\n")}`
    : "Active goals: none.";

  return streamText({
    model,
    system: `You are a helpful nutrition assistant for a meal planning and tracking application.
Your role is to help users:
- Track their daily food intake
- Plan meals and suggest healthy options
- Calculate nutritional information
- Provide personalized recommendations based on their goals
- Answer questions about nutrition and healthy eating

When users want to log food, search for foods first to find the correct food ID, then log it.
Keep answers practical and concise.
The current user ID is: ${userId}
Today's date is: ${new Date().toISOString().split("T")[0]}

${profileContext}
${goalContext}`,
    messages: normalizedMessages as Parameters<
      typeof streamText
    >[0]["messages"],
    tools: createNutritionTools(userId),
    maxToolRoundtrips: 5,
    onFinish: async ({ text, toolCalls, toolResults }) => {
      await onFinish?.({
        text,
        toolCalls,
        toolResults,
      });
    },
  });
}

export const chatRoutes = new Elysia({ prefix: "/chat" })
  .get("/conversations", async ({ request, set }) => {
    const session = await requireRequestSession(request, set);
    if (!session) return { message: "Unauthorized" };

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title || "New conversation",
        updatedAt: conversation.updatedAt,
        preview: conversation.messages[0]?.content || "",
      })),
    };
  })
  .post(
    "/conversations",
    async ({ request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: body.title?.trim() || "New conversation",
        },
      });

      return { conversation };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/conversations/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation) {
        set.status = 404;
        return { message: "Conversation not found" };
      }

      return {
        conversation: {
          ...conversation,
          messages: conversation.messages.map((message) => ({
            id: message.id,
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
            createdAt: message.createdAt,
          })),
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .patch(
    "/conversations/:id",
    async ({ params, request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
        },
      });

      if (!conversation) {
        set.status = 404;
        return { message: "Conversation not found" };
      }

      const updatedConversation = await prisma.conversation.update({
        where: { id: params.id },
        data: {
          title: body.title.trim() || conversation.title || "New conversation",
        },
      });

      return { conversation: updatedConversation };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.String(),
      }),
    },
  )
  .delete(
    "/conversations/:id",
    async ({ params, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
        },
      });

      if (!conversation) {
        set.status = 404;
        return { message: "Conversation not found" };
      }

      await prisma.conversation.delete({
        where: { id: params.id },
      });

      return { message: "Conversation deleted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/",
    async ({ body, request, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const normalizedMessages = Array.isArray(body.messages)
        ? body.messages.map((message) => ({
            ...message,
            content: normalizeMessageContent(message.content),
          }))
        : [];

      const latestUserMessage = [...normalizedMessages]
        .reverse()
        .find((message) => message.role === "user");

      const latestUserText = extractTextContent(latestUserMessage?.content);

      let conversation = body.conversationId
        ? await prisma.conversation.findFirst({
            where: {
              id: body.conversationId,
              userId: session.user.id,
            },
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          })
        : null;

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId: session.user.id,
            title: buildConversationTitle(latestUserText),
          },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
      }

      const latestStoredMessage = conversation.messages[0];

      if (
        latestUserText &&
        (!latestStoredMessage ||
          latestStoredMessage.role !== "USER" ||
          latestStoredMessage.content !== latestUserText)
      ) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "USER",
            content: latestUserText,
          },
        });

        if (!conversation.title) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              title: buildConversationTitle(latestUserText),
            },
          });
        }
      }

      const result = await handleChatRequest(
        body.messages,
        session.user.id,
        async ({ text, toolCalls, toolResults }) => {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: text,
              toolCalls: toolCalls
                ? JSON.parse(JSON.stringify(toolCalls))
                : undefined,
              toolResults: toolResults
                ? JSON.parse(JSON.stringify(toolResults))
                : undefined,
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              updatedAt: new Date(),
            },
          });
        },
      );

      return result.toDataStreamResponse({
        init: {
          headers: {
            "x-conversation-id": conversation.id,
          },
        },
      });
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
              { additionalProperties: true },
            ),
          ),
          conversationId: t.Optional(t.String()),
          input: t.Optional(t.String()),
          id: t.Optional(t.String()),
          metadata: t.Optional(t.Record(t.String(), t.Unknown())),
          temperature: t.Optional(t.Number()),
          topP: t.Optional(t.Number()),
          maxTokens: t.Optional(t.Number()),
          stop: t.Optional(t.Union([t.String(), t.Array(t.String())])),
          toolChoice: t.Optional(t.Unknown()),
        },
        { additionalProperties: true },
      ),
    },
  );
