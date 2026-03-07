import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { foodsRoutes } from "./routes/foods";
import { foodLogsRoutes } from "./routes/food-logs";
import { mealPlansRoutes } from "./routes/meal-plans";
import { goalsRoutes } from "./routes/goals";
import { profileRoutes } from "./routes/profile";
import { chatRoutes } from "./routes/chat";
import { auth } from "./lib/auth";

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
          { name: "Auth", description: "Authentication endpoints" },
        ],
      },
      path: "/docs",
    })
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
  .use(profileRoutes);

export type Api = typeof api;
