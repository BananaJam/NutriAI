"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { themePreferenceToNextTheme } from "@/lib/settings";
import { useAppSettings } from "@/lib/use-app-settings";

export function SettingsThemeSync() {
  const { data } = useAppSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const lastAppliedTheme = useRef<string | null>(null);

  useEffect(() => {
    const themePreference = data?.settings.themePreference;
    if (!themePreference) return;

    const nextTheme = themePreferenceToNextTheme(themePreference);
    if (lastAppliedTheme.current === nextTheme && resolvedTheme) return;

    lastAppliedTheme.current = nextTheme;
    setTheme(nextTheme);
  }, [data?.settings.themePreference, resolvedTheme, setTheme]);

  return null;
}
