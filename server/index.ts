import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { auth } from "./lib/auth";
import { chatRoutes } from "./routes/chat";
import { foodLogsRoutes } from "./routes/food-logs";
import { foodsRoutes } from "./routes/foods";
import { goalsRoutes } from "./routes/goals";
import { mealPlansRoutes } from "./routes/meal-plans";
import { profileRoutes } from "./routes/profile";
import { settingsRoutes } from "./routes/settings";

export const api = new Elysia({ prefix: "/api" })
  .use(
    swagger({
      documentation: {
        info: {
          title: "Nutrition AI Assistant API",
          version: "1.0.0",
          description:
            "API for nutrition tracking, meal planning, and AI-assisted recommendations",
        },
        tags: [
          { name: "Foods", description: "Food database operations" },
          { name: "Food Logs", description: "Daily food logging" },
          { name: "Meal Plans", description: "Meal planning operations" },
          { name: "Goals", description: "User goals management" },
          { name: "Profile", description: "User profile management" },
          { name: "Settings", description: "User settings management" },
          { name: "Auth", description: "Authentication endpoints" },
        ],
      },
      path: "/docs",
    }),
  )
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))
  .all("/auth/*", async ({ request }) => {
    return auth.handler(request);
  })
  .use(foodsRoutes)
  .use(foodLogsRoutes)
  .use(mealPlansRoutes)
  .use(goalsRoutes)
  .use(chatRoutes)
  .use(profileRoutes)
  .use(settingsRoutes);

export type Api = typeof api;
