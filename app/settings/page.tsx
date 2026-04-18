"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  KeyRound,
  LayoutGrid,
  MonitorCog,
  Moon,
  RefreshCcw,
  Save,
  SunMedium,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type UserSettingsPayload } from "@/lib/api";
import {
  type DashboardRange,
  dashboardRangeLabels,
  settingsDefaults,
  type ThemePreference,
  themePreferenceToNextTheme,
  type WeekStart,
  weekStartLabels,
} from "@/lib/settings";
import { useAppSettings } from "@/lib/use-app-settings";
import { cn } from "@/lib/utils";

type SettingsDraft = Omit<UserSettingsPayload["settings"], "updatedAt">;

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    value: "LIGHT",
    label: "Light",
    description: "Bright surfaces and neutral contrast.",
    icon: SunMedium,
  },
  {
    value: "DARK",
    label: "Dark",
    description: "Low-glare workspace for evening use.",
    icon: Moon,
  },
  {
    value: "SYSTEM",
    label: "System",
    description: "Follow your device appearance.",
    icon: MonitorCog,
  },
];

const dashboardRangeOptions = Object.entries(dashboardRangeLabels) as Array<
  [DashboardRange, string]
>;
const weekStartOptions = Object.entries(weekStartLabels) as Array<
  [WeekStart, string]
>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const { data, isLoading } = useAppSettings();
  const [draft, setDraft] = useState<SettingsDraft>(settingsDefaults);

  useEffect(() => {
    if (!data?.settings) return;

    const { updatedAt: _updatedAt, ...nextDraft } = data.settings;
    setDraft(nextDraft);
  }, [data]);

  const persistedSettings = useMemo(
    () =>
      data?.settings
        ? {
            themePreference: data.settings.themePreference,
            defaultDashboardRange: data.settings.defaultDashboardRange,
            compactMode: data.settings.compactMode,
            startWeekOn: data.settings.startWeekOn,
            showCaloriesOnDashboard: data.settings.showCaloriesOnDashboard,
            showProteinOnDashboard: data.settings.showProteinOnDashboard,
            showStreakOnDashboard: data.settings.showStreakOnDashboard,
          }
        : settingsDefaults,
    [data],
  );

  const themeMutation = useMutation({
    mutationFn: async (themePreference: ThemePreference) => {
      const result = await api.api.settings.put({ themePreference });
      if (result.error) throw new Error("Failed to save theme preference");
      return result.data as UserSettingsPayload;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<SettingsDraft>) => {
      const result = await api.api.settings.put(values);
      if (result.error) throw new Error("Failed to save settings");
      return result.data as UserSettingsPayload;
    },
    onSuccess: (nextData) => {
      queryClient.setQueryData(["settings"], nextData);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const isDirty = JSON.stringify(draft) !== JSON.stringify(persistedSettings);
  const savedAt = data?.settings.updatedAt
    ? new Date(data.settings.updatedAt).toLocaleString()
    : null;
  const profileCompletion = data?.profile
    ? Math.round(data.profile.completionScore * 100)
    : 0;

  const updateDraft = <K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleThemeChange = async (themePreference: ThemePreference) => {
    const previousTheme = persistedSettings.themePreference;

    setTheme(themePreferenceToNextTheme(themePreference));
    updateDraft("themePreference", themePreference);
    queryClient.setQueryData(
      ["settings"],
      (current: UserSettingsPayload | null) =>
        current
          ? {
              ...current,
              settings: {
                ...current.settings,
                themePreference,
              },
            }
          : current,
    );

    try {
      const nextData = await themeMutation.mutateAsync(themePreference);
      queryClient.setQueryData(["settings"], nextData);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Theme updated");
    } catch {
      setTheme(themePreferenceToNextTheme(previousTheme));
      updateDraft("themePreference", previousTheme);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.error("Failed to save theme preference");
    }
  };

  const handleSave = async () => {
    const { themePreference: _themePreference, ...values } = draft;
    await saveMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Control center"
        title="Settings"
        description="Manage your appearance, default app behavior, and account shortcuts in one place."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDraft(settingsDefaults)}
              disabled={!isDirty || saveMutation.isPending}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset defaults
            </Button>
            <Button
              className="rounded-xl"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Theme changes apply immediately and persist to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleThemeChange(option.value)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-accent/40",
                      draft.themePreference === option.value
                        ? "border-primary bg-primary/6 shadow-sm"
                        : "border-border/80 bg-background/70",
                    )}
                    disabled={themeMutation.isPending}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                        <option.icon className="h-4 w-4" />
                      </div>
                      {draft.themePreference === option.value ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : null}
                    </div>
                    <p className="mt-4 font-medium">{option.label}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader>
            <CardTitle>Account summary</CardTitle>
            <CardDescription>
              {savedAt ? `Last synced ${savedAt}` : "Saved automatically"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                  <p className="text-sm font-semibold">
                    {data?.account.name || "Your account"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data?.account.email}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                  <p className="text-sm font-semibold">Profile completion</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data?.profile.exists
                      ? `${profileCompletion}% of the core profile is filled in.`
                      : "No profile details saved yet."}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle>App preferences</CardTitle>
            <CardDescription>
              Choose defaults that shape the dashboard and general workspace
              density.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <>
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Default dashboard range</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Controls the default time window shown on the dashboard overview and the progress page charts.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {dashboardRangeOptions.map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          draft.defaultDashboardRange === value
                            ? "default"
                            : "outline"
                        }
                        className="justify-start rounded-xl"
                        onClick={() =>
                          updateDraft("defaultDashboardRange", value)
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Week starts on</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Affects how weekday columns and weekly planning views are ordered.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {weekStartOptions.map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          draft.startWeekOn === value ? "default" : "outline"
                        }
                        className="justify-start rounded-xl"
                        onClick={() => updateDraft("startWeekOn", value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-accent/40",
                    draft.compactMode
                      ? "border-primary bg-primary/6"
                      : "border-border/80 bg-background/70",
                  )}
                  onClick={() => updateDraft("compactMode", !draft.compactMode)}
                >
                  <div>
                    <p className="font-medium">Compact mode</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reduces spacing and card sizes for a denser information layout across all pages.
                    </p>
                  </div>
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </button>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Dashboard metrics</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Toggling these cards off removes them from the dashboard overview entirely.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {[
                      {
                        key: "showCaloriesOnDashboard",
                        title: "Calories",
                        description: "Show today’s calorie summary card.",
                      },
                      {
                        key: "showProteinOnDashboard",
                        title: "Protein",
                        description:
                          "Show daily protein progress on the dashboard.",
                      },
                      {
                        key: "showStreakOnDashboard",
                        title: "Logging streak",
                        description:
                          "Show streak coverage for the selected dashboard range.",
                      },
                    ].map((item) => {
                      const checked = draft[
                        item.key as keyof SettingsDraft
                      ] as boolean;

                      return (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/80 bg-background/70 p-4"
                        >
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-border text-primary"
                            checked={checked}
                            onChange={(event) =>
                              updateDraft(
                                item.key as keyof SettingsDraft,
                                event.target.checked as never,
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage profile information and security-related actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/profile" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-accent/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Edit profile</p>
                      <p className="text-sm text-muted-foreground">
                        Update body metrics and nutrition targets.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/forgot-password" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-accent/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Reset password</p>
                      <p className="text-sm text-muted-foreground">
                        Send yourself a password reset link.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Nutrition setup</CardTitle>
              <CardDescription>
                Your active intake targets are pulled from profile data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: "Calories",
                        value: data?.profile.targetCalories
                          ? `${data.profile.targetCalories} kcal`
                          : "Not set",
                      },
                      {
                        label: "Protein",
                        value: data?.profile.targetProtein
                          ? `${data.profile.targetProtein}g`
                          : "Not set",
                      },
                      {
                        label: "Carbs",
                        value: data?.profile.targetCarbs
                          ? `${data.profile.targetCarbs}g`
                          : "Not set",
                      },
                      {
                        label: "Fat",
                        value: data?.profile.targetFat
                          ? `${data.profile.targetFat}g`
                          : "Not set",
                      },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-border/80 bg-background/70 p-4"
                      >
                        <p className="text-sm text-muted-foreground">
                          {metric.label}
                        </p>
                        <p className="mt-1 font-medium">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    <Link href="/profile">Update profile targets</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
