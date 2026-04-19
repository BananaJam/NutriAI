"use client";

import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return new URL("/api/auth", appUrl).toString();
  }

  if (typeof window !== "undefined") {
    return new URL("/api/auth", window.location.origin).toString();
  }

  return "http://localhost:3000/api/auth";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});

export type AuthSession = typeof authClient.$Infer.Session;
