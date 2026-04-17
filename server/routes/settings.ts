import { Elysia, t } from "elysia";
import { settingsDefaults } from "@/lib/settings";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

const themePreferenceSchema = t.Union([
  t.Literal("LIGHT"),
  t.Literal("DARK"),
  t.Literal("SYSTEM"),
]);

const dashboardRangeSchema = t.Union([
  t.Literal("DAYS_7"),
  t.Literal("DAYS_30"),
  t.Literal("DAYS_90"),
]);

const weekStartSchema = t.Union([t.Literal("MONDAY"), t.Literal("SUNDAY")]);

async function getSettingsPayload(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      settings: true,
      profile: true,
    },
  });

  const settings =
    user.settings ??
    (await prisma.userSettings.create({
      data: {
        userId,
        ...settingsDefaults,
      },
    }));

  const profile = user.profile;
  const completedFields = [
    profile?.height,
    profile?.weight,
    profile?.targetCalories,
    profile?.targetProtein,
  ].filter((value) => value !== null && value !== undefined).length;

  return {
    settings: {
      themePreference: settings.themePreference,
      defaultDashboardRange: settings.defaultDashboardRange,
      compactMode: settings.compactMode,
      startWeekOn: settings.startWeekOn,
      showCaloriesOnDashboard: settings.showCaloriesOnDashboard,
      showProteinOnDashboard: settings.showProteinOnDashboard,
      showStreakOnDashboard: settings.showStreakOnDashboard,
      updatedAt: settings.updatedAt.toISOString(),
    },
    account: {
      name: user.name,
      email: user.email,
      image: user.image,
    },
    profile: {
      exists: !!profile,
      completionScore: profile ? completedFields / 4 : 0,
      activityLevel: profile?.activityLevel ?? null,
      height: profile?.height ?? null,
      weight: profile?.weight ?? null,
      targetCalories: profile?.targetCalories ?? null,
      targetProtein: profile?.targetProtein ?? null,
      targetCarbs: profile?.targetCarbs ?? null,
      targetFat: profile?.targetFat ?? null,
    },
  };
}

export const settingsRoutes = new Elysia({ prefix: "/settings" })
  .get("/", async ({ request, set }) => {
    const session = await requireRequestSession(request, set);
    if (!session) return { message: "Unauthorized" };

    return getSettingsPayload(session.user.id);
  })
  .put(
    "/",
    async ({ request, body, set }) => {
      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...settingsDefaults,
          ...body,
        },
        update: body,
      });

      return getSettingsPayload(session.user.id);
    },
    {
      body: t.Object({
        themePreference: t.Optional(themePreferenceSchema),
        defaultDashboardRange: t.Optional(dashboardRangeSchema),
        compactMode: t.Optional(t.Boolean()),
        startWeekOn: t.Optional(weekStartSchema),
        showCaloriesOnDashboard: t.Optional(t.Boolean()),
        showProteinOnDashboard: t.Optional(t.Boolean()),
        showStreakOnDashboard: t.Optional(t.Boolean()),
      }),
    },
  );
