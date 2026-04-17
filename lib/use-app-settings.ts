"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type UserSettingsPayload } from "@/lib/api";
import { useSessionUser } from "@/lib/use-session-user";

export function useAppSettings() {
  const { userId } = useSessionUser();

  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<UserSettingsPayload | null> => {
      const result = await api.api.settings.get();
      if (result.error) return null;
      return result.data as UserSettingsPayload;
    },
    enabled: !!userId,
  });
}
