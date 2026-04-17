"use client";

import { createAuthClient } from "better-auth/react";

const baseURL =
  typeof window === "undefined"
    ? "http://localhost:3000/api/auth"
    : "/api/auth";

export const authClient = createAuthClient({
  baseURL,
});

export type AuthSession = typeof authClient.$Infer.Session;
