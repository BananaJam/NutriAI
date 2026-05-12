import { auth } from "@/server/lib/auth";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const demoUser = {
  email: "demo.report@example.com",
  password: "ReportDemo123!",
  name: "Вибираний Владислав",
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

async function assertAgentLabSchema() {
  const [runsTable, toolEventsTable] = await Promise.all([
    prisma.$queryRaw<Array<{ exists: number }>>`
      SELECT COUNT(*)::int AS exists
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'agent_lab_runs'
    `,
    prisma.$queryRaw<Array<{ exists: number }>>`
      SELECT COUNT(*)::int AS exists
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'agent_lab_tool_events'
    `,
  ]);

  if (!runsTable[0]?.exists || !toolEventsTable[0]?.exists) {
    throw new Error(
      "The agent lab tables are missing from the current database. Run `bun run db:push` or your Prisma migration flow before `bun run report:seed`.",
    );
  }
}

const foods = [
  {
    id: "chicken-breast",
    name: "Chicken Breast",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
    isVerified: true,
  },
  {
    id: "brown-rice",
    name: "Brown Rice",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 112,
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
    fiber: 1.8,
    sugar: 0.4,
    sodium: 5,
    isVerified: true,
  },
  {
    id: "broccoli",
    name: "Broccoli",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fat: 0.4,
    fiber: 2.6,
    sugar: 1.7,
    sodium: 33,
    isVerified: true,
  },
  {
    id: "salmon-fillet",
    name: "Salmon Fillet",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
    fiber: 0,
    sugar: 0,
    sodium: 59,
    isVerified: true,
  },
  {
    id: "greek-yogurt",
    name: "Greek Yogurt",
    brand: "Fage",
    servingSize: 170,
    servingUnit: "g",
    calories: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    fiber: 0,
    sugar: 5,
    sodium: 65,
    isVerified: true,
  },
  {
    id: "almonds",
    name: "Almonds",
    brand: null,
    servingSize: 28,
    servingUnit: "g",
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    fiber: 3.5,
    sugar: 1.2,
    sodium: 0,
    isVerified: true,
  },
  {
    id: "banana",
    name: "Banana",
    brand: null,
    servingSize: 118,
    servingUnit: "g",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    sugar: 14,
    sodium: 1,
    isVerified: true,
  },
  {
    id: "egg",
    name: "Egg",
    brand: null,
    servingSize: 50,
    servingUnit: "g",
    calories: 78,
    protein: 6,
    carbs: 0.6,
    fat: 5,
    fiber: 0,
    sugar: 0.6,
    sodium: 62,
    isVerified: true,
  },
  {
    id: "oatmeal",
    name: "Oatmeal",
    brand: "Quaker",
    servingSize: 40,
    servingUnit: "g",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    fiber: 4,
    sugar: 1,
    sodium: 0,
    isVerified: true,
  },
  {
    id: "sweet-potato",
    name: "Sweet Potato",
    brand: null,
    servingSize: 130,
    servingUnit: "g",
    calories: 112,
    protein: 2,
    carbs: 26,
    fat: 0.1,
    fiber: 3.9,
    sugar: 5.4,
    sodium: 72,
    isVerified: true,
  },
  {
    id: "avocado",
    name: "Avocado",
    brand: null,
    servingSize: 150,
    servingUnit: "g",
    calories: 240,
    protein: 3,
    carbs: 13,
    fat: 22,
    fiber: 10,
    sugar: 1,
    sodium: 10,
    isVerified: true,
  },
  {
    id: "spinach",
    name: "Spinach",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    sugar: 0.4,
    sodium: 79,
    isVerified: true,
  },
  {
    id: "whole-wheat-bread",
    name: "Whole Wheat Bread",
    brand: null,
    servingSize: 28,
    servingUnit: "g",
    calories: 69,
    protein: 3.6,
    carbs: 12,
    fat: 1.1,
    fiber: 1.9,
    sugar: 1.4,
    sodium: 132,
    isVerified: true,
  },
  {
    id: "cottage-cheese",
    name: "Cottage Cheese",
    brand: null,
    servingSize: 113,
    servingUnit: "g",
    calories: 98,
    protein: 11,
    carbs: 3.4,
    fat: 4.3,
    fiber: 0,
    sugar: 3.1,
    sodium: 364,
    isVerified: true,
  },
  {
    id: "quinoa",
    name: "Quinoa",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 120,
    protein: 4.4,
    carbs: 21,
    fat: 1.9,
    fiber: 2.8,
    sugar: 0.9,
    sodium: 7,
    isVerified: true,
  },
];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function ensureDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: demoUser.email },
  });

  if (existing) {
    await prisma.user.delete({
      where: { id: existing.id },
    });
  }

  await auth.api.signUpEmail({
    headers: new Headers({
      origin: appUrl,
    }),
    body: {
      email: demoUser.email,
      password: demoUser.password,
      name: demoUser.name,
    },
  });

  return prisma.user.findUniqueOrThrow({
    where: { email: demoUser.email },
  });
}

async function seedFoods() {
  for (const food of foods) {
    await prisma.food.upsert({
      where: { id: food.id },
      update: food,
      create: food,
    });
  }
}

async function seedProfile(userId: string) {
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      gender: "MALE",
      height: 182,
      weight: 79,
      activityLevel: "MODERATE",
      targetCalories: 2500,
      targetProtein: 180,
      targetCarbs: 250,
      targetFat: 75,
    },
    create: {
      userId,
      gender: "MALE",
      height: 182,
      weight: 79,
      activityLevel: "MODERATE",
      targetCalories: 2500,
      targetProtein: 180,
      targetCarbs: 250,
      targetFat: 75,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId },
    update: {
      defaultDashboardRange: "DAYS_30",
      compactMode: false,
      startWeekOn: "MONDAY",
      showCaloriesOnDashboard: true,
      showProteinOnDashboard: true,
      showStreakOnDashboard: true,
    },
    create: {
      userId,
      defaultDashboardRange: "DAYS_30",
      compactMode: false,
      startWeekOn: "MONDAY",
      showCaloriesOnDashboard: true,
      showProteinOnDashboard: true,
      showStreakOnDashboard: true,
    },
  });
}

async function seedFavorites(userId: string) {
  await prisma.userFoodFavorite.createMany({
    data: ["greek-yogurt", "chicken-breast", "oatmeal", "banana"].map(
      (foodId) => ({
        userId,
        foodId,
      }),
    ),
    skipDuplicates: true,
  });
}

async function seedGoals(userId: string, today: Date) {
  await prisma.goal.createMany({
    data: [
      {
        userId,
        type: "PROTEIN_TARGET",
        targetValue: 180,
        currentValue: 162,
        unit: "g/day",
        startDate: addDays(today, -21),
        endDate: addDays(today, 14),
        status: "ACTIVE",
      },
      {
        userId,
        type: "CALORIE_TARGET",
        targetValue: 2500,
        currentValue: 2360,
        unit: "kcal/day",
        startDate: addDays(today, -21),
        endDate: addDays(today, 14),
        status: "ACTIVE",
      },
      {
        userId,
        type: "WEIGHT_LOSS",
        targetValue: 76,
        currentValue: 79,
        unit: "kg",
        startDate: addDays(today, -30),
        endDate: addDays(today, 45),
        status: "ACTIVE",
      },
    ],
  });
}

async function seedMealPlan(userId: string, today: Date) {
  const monday = addDays(today, -((today.getUTCDay() + 6) % 7));
  const sunday = addDays(monday, 6);

  const plan = await prisma.mealPlan.create({
    data: {
      userId,
      name: "Weekly Cut Plan",
      startDate: monday,
      endDate: sunday,
      isActive: true,
      items: {
        create: [
          {
            foodId: "oatmeal",
            dayOfWeek: 1,
            mealType: "BREAKFAST",
            servings: 1,
            notes: "Add banana slices.",
          },
          {
            foodId: "greek-yogurt",
            dayOfWeek: 1,
            mealType: "SNACK",
            servings: 1,
            notes: "Post-workout snack.",
          },
          {
            foodId: "chicken-breast",
            dayOfWeek: 1,
            mealType: "LUNCH",
            servings: 1.8,
            notes: "Pair with rice and broccoli.",
          },
          {
            foodId: "brown-rice",
            dayOfWeek: 1,
            mealType: "LUNCH",
            servings: 1.4,
            notes: "",
          },
          {
            foodId: "salmon-fillet",
            dayOfWeek: 2,
            mealType: "DINNER",
            servings: 1.4,
            notes: "Rotate with sweet potato.",
          },
          {
            foodId: "sweet-potato",
            dayOfWeek: 2,
            mealType: "DINNER",
            servings: 1.2,
            notes: "",
          },
          {
            foodId: "egg",
            dayOfWeek: 3,
            mealType: "BREAKFAST",
            servings: 3,
            notes: "Serve with spinach.",
          },
          {
            foodId: "spinach",
            dayOfWeek: 3,
            mealType: "BREAKFAST",
            servings: 1,
            notes: "",
          },
          {
            foodId: "chicken-breast",
            dayOfWeek: 4,
            mealType: "DINNER",
            servings: 2,
            notes: "Lean protein dinner.",
          },
          {
            foodId: "quinoa",
            dayOfWeek: 4,
            mealType: "DINNER",
            servings: 1.4,
            notes: "",
          },
          {
            foodId: "cottage-cheese",
            dayOfWeek: 5,
            mealType: "SNACK",
            servings: 1,
            notes: "Evening snack.",
          },
          {
            foodId: "almonds",
            dayOfWeek: 5,
            mealType: "SNACK",
            servings: 1,
            notes: "",
          },
        ],
      },
    },
  });

  return plan;
}

async function seedLogs(userId: string, today: Date) {
  const schedule = [
    {
      offset: 6,
      items: [
        { foodId: "oatmeal", mealType: "BREAKFAST", servings: 1 },
        { foodId: "banana", mealType: "BREAKFAST", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.8 },
        { foodId: "brown-rice", mealType: "LUNCH", servings: 1.5 },
        { foodId: "broccoli", mealType: "LUNCH", servings: 1.3 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.4 },
        { foodId: "sweet-potato", mealType: "DINNER", servings: 1.2 },
      ],
    },
    {
      offset: 5,
      items: [
        { foodId: "egg", mealType: "BREAKFAST", servings: 3 },
        { foodId: "whole-wheat-bread", mealType: "BREAKFAST", servings: 2 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.6 },
        { foodId: "quinoa", mealType: "LUNCH", servings: 1.5 },
        { foodId: "broccoli", mealType: "DINNER", servings: 1.4 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.2 },
      ],
    },
    {
      offset: 4,
      items: [
        { foodId: "oatmeal", mealType: "BREAKFAST", servings: 1 },
        { foodId: "banana", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.7 },
        { foodId: "brown-rice", mealType: "LUNCH", servings: 1.6 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.3 },
        { foodId: "sweet-potato", mealType: "DINNER", servings: 1.1 },
      ],
    },
    {
      offset: 3,
      items: [
        { foodId: "egg", mealType: "BREAKFAST", servings: 2 },
        { foodId: "whole-wheat-bread", mealType: "BREAKFAST", servings: 2 },
        { foodId: "cottage-cheese", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 2 },
        { foodId: "quinoa", mealType: "LUNCH", servings: 1.4 },
        { foodId: "almonds", mealType: "SNACK", servings: 1 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.2 },
      ],
    },
    {
      offset: 2,
      items: [
        { foodId: "oatmeal", mealType: "BREAKFAST", servings: 1 },
        { foodId: "banana", mealType: "BREAKFAST", servings: 1 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.8 },
        { foodId: "brown-rice", mealType: "LUNCH", servings: 1.3 },
        { foodId: "broccoli", mealType: "DINNER", servings: 1.3 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.1 },
      ],
    },
    {
      offset: 1,
      items: [
        { foodId: "egg", mealType: "BREAKFAST", servings: 3 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.9 },
        { foodId: "quinoa", mealType: "LUNCH", servings: 1.5 },
        { foodId: "almonds", mealType: "SNACK", servings: 1 },
        { foodId: "salmon-fillet", mealType: "DINNER", servings: 1.2 },
        { foodId: "sweet-potato", mealType: "DINNER", servings: 1.3 },
      ],
    },
    {
      offset: 0,
      items: [
        {
          foodId: "oatmeal",
          mealType: "BREAKFAST",
          servings: 1,
          notes: "Pre-work breakfast",
        },
        { foodId: "banana", mealType: "BREAKFAST", servings: 1 },
        { foodId: "greek-yogurt", mealType: "SNACK", servings: 1 },
        { foodId: "chicken-breast", mealType: "LUNCH", servings: 1.8 },
        { foodId: "brown-rice", mealType: "LUNCH", servings: 1.4 },
        { foodId: "broccoli", mealType: "LUNCH", servings: 1.2 },
        { foodId: "cottage-cheese", mealType: "SNACK", servings: 1 },
        {
          foodId: "salmon-fillet",
          mealType: "DINNER",
          servings: 1.3,
          notes: "Dinner after training",
        },
        { foodId: "sweet-potato", mealType: "DINNER", servings: 1.1 },
      ],
    },
  ] as const;

  for (const day of schedule) {
    const date = addDays(today, -day.offset);
    const log = await prisma.foodLog.create({
      data: {
        userId,
        date,
      },
    });

    await prisma.foodLogItem.createMany({
      data: day.items.map((item, index) => ({
        foodLogId: log.id,
        foodId: item.foodId,
        mealType: item.mealType,
        servings: item.servings,
        notes: "notes" in item ? (item.notes ?? null) : null,
        loggedAt: new Date(
          `${toDateKey(date)}T${String(7 + index).padStart(2, "0")}:00:00.000Z`,
        ),
      })),
    });
  }
}

async function seedConversation(userId: string, today: Date) {
  const startDate = toDateKey(addDays(today, -6));
  const endDate = toDateKey(today);

  await prisma.conversation.create({
    data: {
      userId,
      title: "Аналіз білка та сніданків",
      messages: {
        create: [
          {
            role: "USER",
            content:
              "Оціни мій білок за останній тиждень і підкажи, що краще з високобілкових сніданків.",
          },
          {
            role: "ASSISTANT",
            content:
              "За останні 7 днів середнє споживання білка тримається близько 162 г на добу, тобто ти близько до цілі 180 г. Найзручніші варіанти для посилення сніданку в твоєму каталозі — Greek Yogurt, Egg та Chicken Breast у meal prep форматі. Якщо хочеш підтягнути білок без зайвих калорій, найкращий варіант для ранку — Greek Yogurt + banana або яйця зі шпинатом.",
            toolCalls: [
              {
                toolCallId: "call-stats",
                toolName: "getUserStats",
                args: {
                  startDate,
                  endDate,
                },
              },
              {
                toolCallId: "call-foods",
                toolName: "searchFoods",
                args: {
                  query: "protein breakfast",
                  limit: 5,
                },
              },
            ],
            toolResults: [
              {
                toolCallId: "call-stats",
                result: {
                  daysLogged: 7,
                  averages: {
                    calories: 2368,
                    protein: 162,
                    carbs: 201,
                    fat: 71,
                  },
                  streak: {
                    current: 7,
                    longest: 7,
                  },
                },
              },
              {
                toolCallId: "call-foods",
                result: [
                  {
                    id: "greek-yogurt",
                    name: "Greek Yogurt",
                    protein: 17,
                    calories: 100,
                    isFavorite: true,
                  },
                  {
                    id: "egg",
                    name: "Egg",
                    protein: 6,
                    calories: 78,
                    isFavorite: false,
                  },
                  {
                    id: "chicken-breast",
                    name: "Chicken Breast",
                    protein: 31,
                    calories: 165,
                    isFavorite: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  });
}

async function seedAgentLabRuns(userId: string) {
  const runs = [
    {
      sdk: "VERCEL_AI",
      scenarioId: "HIGH_PROTEIN_BREAKFAST",
      prompt: "Find a high-protein breakfast from my saved foods.",
      response:
        "The best high-protein breakfast from your saved foods is Greek Yogurt with a banana. It gives you 17 g of protein with moderate calories, and you can add eggs on heavier training days to push breakfast protein higher.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "searchFoods",
          state: "CALL",
          args: { query: "saved favorite breakfast protein foods", limit: 5 },
        },
        {
          position: 2,
          toolName: "searchFoods",
          state: "RESULT",
          result: [
            { id: "greek-yogurt", name: "Greek Yogurt", protein: 17 },
            { id: "egg", name: "Egg", protein: 6 },
            { id: "oatmeal", name: "Oatmeal", protein: 5 },
          ],
        },
        {
          position: 3,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 4,
          toolName: "getUserProfile",
          state: "RESULT",
          result: {
            targetCalories: 2500,
            targetProtein: 180,
            targetCarbs: 250,
            targetFat: 75,
          },
        },
        {
          position: 5,
          toolName: "getActiveGoals",
          state: "CALL",
          args: {},
        },
        {
          position: 6,
          toolName: "getActiveGoals",
          state: "RESULT",
          result: [
            { type: "PROTEIN_TARGET", targetValue: 180, currentValue: 162 },
          ],
        },
      ],
    },
    {
      sdk: "OPENAI_AGENTS",
      scenarioId: "HIGH_PROTEIN_BREAKFAST",
      prompt: "Find a high-protein breakfast from my saved foods.",
      response:
        "From your favorites, Greek Yogurt is the strongest breakfast base and eggs are the easiest way to raise protein further. A yogurt plus banana breakfast is the cleanest default, while eggs with spinach are better when you want a more filling option.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getUserProfile",
          state: "RESULT",
          result: {
            targetCalories: 2500,
            targetProtein: 180,
          },
        },
        {
          position: 3,
          toolName: "searchFoods",
          state: "CALL",
          args: { query: "favorite high protein breakfast foods", limit: 5 },
        },
        {
          position: 4,
          toolName: "searchFoods",
          state: "RESULT",
          result: [
            { id: "greek-yogurt", name: "Greek Yogurt", protein: 17 },
            { id: "egg", name: "Egg", protein: 6 },
            { id: "cottage-cheese", name: "Cottage Cheese", protein: 11 },
          ],
        },
        {
          position: 5,
          toolName: "getActiveGoals",
          state: "CALL",
          args: {},
        },
        {
          position: 6,
          toolName: "getActiveGoals",
          state: "RESULT",
          result: [
            { type: "PROTEIN_TARGET", targetValue: 180, currentValue: 162 },
          ],
        },
      ],
    },
    {
      sdk: "LANGGRAPH",
      scenarioId: "HIGH_PROTEIN_BREAKFAST",
      prompt: "Find a high-protein breakfast from my saved foods.",
      response:
        "A practical high-protein breakfast from your saved foods is Greek Yogurt with banana, and the most protein-dense upgrade is adding eggs. This keeps breakfast simple while closing the gap to your 180 g daily protein goal.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "searchFoods",
          state: "CALL",
          args: { query: "protein breakfast favorites", limit: 5 },
        },
        {
          position: 2,
          toolName: "searchFoods",
          state: "RESULT",
          result: [
            { id: "greek-yogurt", name: "Greek Yogurt", protein: 17 },
            { id: "egg", name: "Egg", protein: 6 },
          ],
        },
        {
          position: 3,
          toolName: "getActiveGoals",
          state: "CALL",
          args: {},
        },
        {
          position: 4,
          toolName: "getActiveGoals",
          state: "RESULT",
          result: [
            { type: "PROTEIN_TARGET", targetValue: 180, currentValue: 162 },
          ],
        },
      ],
    },
    {
      sdk: "VERCEL_AI",
      scenarioId: "LOG_RECENT_LUNCH",
      prompt: "Add one of my recent lunches to today.",
      response:
        "I added a recent lunch pattern to today: chicken breast, brown rice, and broccoli. That keeps the meal aligned with your existing high-protein routine.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getDailyLog",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getDailyLog",
          state: "RESULT",
          result: { items: 9, calories: 2297 },
        },
        {
          position: 3,
          toolName: "searchFoods",
          state: "CALL",
          args: { query: "recent lunch chicken rice broccoli", limit: 6 },
        },
        {
          position: 4,
          toolName: "searchFoods",
          state: "RESULT",
          result: [
            { id: "chicken-breast", name: "Chicken Breast" },
            { id: "brown-rice", name: "Brown Rice" },
            { id: "broccoli", name: "Broccoli" },
          ],
        },
        {
          position: 5,
          toolName: "logFood",
          state: "CALL",
          args: {
            mealType: "LUNCH",
            items: [
              { foodId: "chicken-breast", servings: 1.8 },
              { foodId: "brown-rice", servings: 1.4 },
              { foodId: "broccoli", servings: 1.2 },
            ],
          },
        },
        {
          position: 6,
          toolName: "logFood",
          state: "RESULT",
          result: { createdItems: 3, totalCalories: 489 },
        },
      ],
    },
    {
      sdk: "OPENAI_AGENTS",
      scenarioId: "LOG_RECENT_LUNCH",
      prompt: "Add one of my recent lunches to today.",
      response:
        "Logged one of your recent lunches for today using the familiar chicken, brown rice, and broccoli combination.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "searchFoods",
          state: "CALL",
          args: { query: "recent high protein lunch foods", limit: 6 },
        },
        {
          position: 2,
          toolName: "searchFoods",
          state: "RESULT",
          result: [
            { id: "chicken-breast", name: "Chicken Breast" },
            { id: "brown-rice", name: "Brown Rice" },
            { id: "broccoli", name: "Broccoli" },
          ],
        },
        {
          position: 3,
          toolName: "logFood",
          state: "CALL",
          args: {
            mealType: "LUNCH",
            items: [
              { foodId: "chicken-breast", servings: 1.8 },
              { foodId: "brown-rice", servings: 1.4 },
              { foodId: "broccoli", servings: 1.2 },
            ],
          },
        },
        {
          position: 4,
          toolName: "logFood",
          state: "RESULT",
          result: { createdItems: 3, totalProtein: 62.5 },
        },
      ],
    },
    {
      sdk: "LANGGRAPH",
      scenarioId: "LOG_RECENT_LUNCH",
      prompt: "Add one of my recent lunches to today.",
      response:
        "I reused your recent lunch pattern and logged chicken breast, brown rice, and broccoli to today's lunch.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getDailyLog",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getDailyLog",
          state: "RESULT",
          result: { items: 9, calories: 2297 },
        },
        {
          position: 3,
          toolName: "logFood",
          state: "CALL",
          args: {
            mealType: "LUNCH",
            items: [
              { foodId: "chicken-breast", servings: 1.8 },
              { foodId: "brown-rice", servings: 1.4 },
              { foodId: "broccoli", servings: 1.2 },
            ],
          },
        },
        {
          position: 4,
          toolName: "logFood",
          state: "RESULT",
          result: { createdItems: 3, totalCalories: 489 },
        },
      ],
    },
    {
      sdk: "VERCEL_AI",
      scenarioId: "WEEKLY_NUTRITION_REVIEW",
      prompt: "Summarize my nutrition this week against my goals.",
      response:
        "Across the last week you averaged about 2368 kcal and 162 g protein per day. Calories are close to target, but protein still sits below the 180 g goal, so adding one stronger protein block to breakfast or lunch would close most of the gap.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserStats",
          state: "CALL",
          args: { range: "last-7-days" },
        },
        {
          position: 2,
          toolName: "getUserStats",
          state: "RESULT",
          result: {
            averages: { calories: 2368, protein: 162, carbs: 201, fat: 71 },
            daysLogged: 7,
          },
        },
        {
          position: 3,
          toolName: "getActiveGoals",
          state: "CALL",
          args: {},
        },
        {
          position: 4,
          toolName: "getActiveGoals",
          state: "RESULT",
          result: [
            { type: "CALORIE_TARGET", targetValue: 2500, currentValue: 2360 },
            { type: "PROTEIN_TARGET", targetValue: 180, currentValue: 162 },
          ],
        },
      ],
    },
    {
      sdk: "OPENAI_AGENTS",
      scenarioId: "WEEKLY_NUTRITION_REVIEW",
      prompt: "Summarize my nutrition this week against my goals.",
      response:
        "Your weekly calorie intake stayed close to plan, while protein was consistently a little low relative to the 180 g target. The main adjustment should be reinforcing breakfast or lunch with one more lean protein serving.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getUserProfile",
          state: "RESULT",
          result: { targetCalories: 2500, targetProtein: 180 },
        },
        {
          position: 3,
          toolName: "getUserStats",
          state: "CALL",
          args: { range: "last-7-days" },
        },
        {
          position: 4,
          toolName: "getUserStats",
          state: "RESULT",
          result: {
            averages: { calories: 2368, protein: 162 },
            streak: { current: 7, longest: 7 },
          },
        },
      ],
    },
    {
      sdk: "LANGGRAPH",
      scenarioId: "WEEKLY_NUTRITION_REVIEW",
      prompt: "Summarize my nutrition this week against my goals.",
      response:
        "The weekly pattern is stable: calories remain near target, but protein stays modestly under goal. A repeatable fix would be increasing protein at the first meal of the day instead of relying on dinner recovery.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserStats",
          state: "CALL",
          args: { range: "last-7-days" },
        },
        {
          position: 2,
          toolName: "getUserStats",
          state: "RESULT",
          result: {
            averages: { calories: 2368, protein: 162, carbs: 201, fat: 71 },
          },
        },
        {
          position: 3,
          toolName: "getActiveGoals",
          state: "CALL",
          args: {},
        },
        {
          position: 4,
          toolName: "getActiveGoals",
          state: "RESULT",
          result: [
            { type: "PROTEIN_TARGET", targetValue: 180, currentValue: 162 },
          ],
        },
      ],
    },
    {
      sdk: "VERCEL_AI",
      scenarioId: "CALCULATE_MACROS",
      prompt: "Calculate recommended macros from my current profile data.",
      response:
        "Based on your current profile, the working recommendation is 2500 kcal with roughly 180 g protein, 250 g carbs, and 75 g fat. That matches the active targets already stored in your profile.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getUserProfile",
          state: "RESULT",
          result: {
            gender: "MALE",
            height: 182,
            weight: 79,
            activityLevel: "MODERATE",
          },
        },
        {
          position: 3,
          toolName: "calculateMacros",
          state: "CALL",
          args: { goal: "maintain-cutting-bias" },
        },
        {
          position: 4,
          toolName: "calculateMacros",
          state: "RESULT",
          result: {
            targetCalories: 2500,
            targetProtein: 180,
            targetCarbs: 250,
            targetFat: 75,
          },
        },
      ],
    },
    {
      sdk: "OPENAI_AGENTS",
      scenarioId: "CALCULATE_MACROS",
      prompt: "Calculate recommended macros from my current profile data.",
      response:
        "Your profile supports a recommendation around 2500 kcal with protein anchored near 180 g, then carbs at 250 g and fat at 75 g. The result is consistent with the current application targets.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getUserProfile",
          state: "RESULT",
          result: {
            gender: "MALE",
            height: 182,
            weight: 79,
            activityLevel: "MODERATE",
          },
        },
        {
          position: 3,
          toolName: "calculateMacros",
          state: "CALL",
          args: { goal: "maintenance" },
        },
        {
          position: 4,
          toolName: "calculateMacros",
          state: "RESULT",
          result: {
            targetCalories: 2500,
            targetProtein: 180,
            targetCarbs: 250,
            targetFat: 75,
          },
        },
      ],
    },
    {
      sdk: "LANGGRAPH",
      scenarioId: "CALCULATE_MACROS",
      prompt: "Calculate recommended macros from my current profile data.",
      response:
        "The macro calculation resolves to the same target structure already used in the profile: 2500 kcal, 180 g protein, 250 g carbs, and 75 g fat.",
      rawTrace: {
        source: "report-fixture",
        note: "Saved comparison run for the report dataset.",
      },
      toolEvents: [
        {
          position: 1,
          toolName: "getUserProfile",
          state: "CALL",
          args: {},
        },
        {
          position: 2,
          toolName: "getUserProfile",
          state: "RESULT",
          result: {
            gender: "MALE",
            height: 182,
            weight: 79,
            activityLevel: "MODERATE",
          },
        },
        {
          position: 3,
          toolName: "calculateMacros",
          state: "CALL",
          args: { goal: "keep current target" },
        },
        {
          position: 4,
          toolName: "calculateMacros",
          state: "RESULT",
          result: {
            targetCalories: 2500,
            targetProtein: 180,
            targetCarbs: 250,
            targetFat: 75,
          },
        },
      ],
    },
  ] as const;

  for (const run of runs) {
    await prisma.agentLabRun.create({
      data: {
        userId,
        sdk: run.sdk,
        scenarioId: run.scenarioId,
        conversationId: `report-${run.sdk.toLowerCase()}-${run.scenarioId.toLowerCase()}`,
        prompt: run.prompt,
        response: run.response,
        status: "COMPLETED",
        rawTrace: run.rawTrace,
        toolEvents: {
          create: run.toolEvents.map((event) => ({
            position: event.position,
            toolName: event.toolName,
            state: event.state,
            args: "args" in event ? event.args : undefined,
            result: "result" in event ? event.result : undefined,
          })),
        },
      },
    });
  }
}

async function main() {
  console.log("Seeding report demo dataset...");
  await assertAgentLabSchema();

  await seedFoods();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const user = await ensureDemoUser();

  await prisma.$transaction(async (tx) => {
    await tx.agentLabToolEvent.deleteMany({
      where: { run: { userId: user.id } },
    });
    await tx.agentLabRun.deleteMany({ where: { userId: user.id } });
    await tx.userFoodFavorite.deleteMany({ where: { userId: user.id } });
    await tx.goal.deleteMany({ where: { userId: user.id } });
    await tx.message.deleteMany({
      where: { conversation: { userId: user.id } },
    });
    await tx.conversation.deleteMany({ where: { userId: user.id } });
    await tx.foodLogItem.deleteMany({
      where: { foodLog: { userId: user.id } },
    });
    await tx.foodLog.deleteMany({ where: { userId: user.id } });
    await tx.mealPlanItem.deleteMany({
      where: { mealPlan: { userId: user.id } },
    });
    await tx.mealPlan.deleteMany({ where: { userId: user.id } });
  });

  await seedProfile(user.id);
  await seedFavorites(user.id);
  await seedGoals(user.id, today);
  await seedMealPlan(user.id, today);
  await seedLogs(user.id, today);
  await seedConversation(user.id, today);
  await seedAgentLabRuns(user.id);

  console.log(`Demo report user: ${demoUser.email}`);
  console.log(`Demo report password: ${demoUser.password}`);
  console.log("Report demo dataset ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
