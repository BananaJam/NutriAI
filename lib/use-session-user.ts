"use client";

import { authClient } from "@/lib/auth-client";

export function useSessionUser() {
  const session = authClient.useSession();

  return {
    ...session,
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    userId: session.data?.user?.id ?? null,
  };
}
