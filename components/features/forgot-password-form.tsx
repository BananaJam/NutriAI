"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/features/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const redirectTo =
        typeof window === "undefined"
          ? "http://localhost:3000/reset-password"
          : `${window.location.origin}/reset-password`;

      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirectTo,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to request password reset");
        return;
      }

      toast.success(
        "Reset requested. In development, check the server logs for the reset link.",
      );
    });
  };

  return (
    <AuthCard
      title="Reset password"
      description="We will generate a reset link for your account."
      footerText="Remembered your password?"
      footerHref="/sign-in"
      footerLinkLabel="Back to sign in"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
