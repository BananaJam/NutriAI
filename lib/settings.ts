export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";
export type DashboardRange = "DAYS_7" | "DAYS_30" | "DAYS_90";
export type WeekStart = "MONDAY" | "SUNDAY";

export const settingsDefaults = {
  themePreference: "SYSTEM" as ThemePreference,
  defaultDashboardRange: "DAYS_30" as DashboardRange,
  compactMode: false,
  startWeekOn: "MONDAY" as WeekStart,
  showCaloriesOnDashboard: true,
  showProteinOnDashboard: true,
  showStreakOnDashboard: true,
};

export const dashboardRangeDays: Record<DashboardRange, number> = {
  DAYS_7: 7,
  DAYS_30: 30,
  DAYS_90: 90,
};

export const dashboardRangeLabels: Record<DashboardRange, string> = {
  DAYS_7: "Last 7 days",
  DAYS_30: "Last 30 days",
  DAYS_90: "Last 90 days",
};

export const weekStartLabels: Record<WeekStart, string> = {
  MONDAY: "Monday",
  SUNDAY: "Sunday",
};

export function themePreferenceToNextTheme(theme: ThemePreference) {
  return theme.toLowerCase() as "light" | "dark" | "system";
}
