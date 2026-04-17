"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/features/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const error = useMemo(() => searchParams.get("error"), [searchParams]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error("Missing or invalid reset token");
      return;
    }

    startTransition(async () => {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        toast.error(resetError.message || "Failed to reset password");
        return;
      }

      toast.success("Password updated");
      router.replace("/sign-in");
    });
  };

  return (
    <AuthCard
      title="Choose a new password"
      description="Set a new password for your account."
      footerText="Need a new link?"
      footerHref="/forgot-password"
      footerLinkLabel="Request another reset"
    >
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          This reset link is invalid or expired.
        </p>
      ) : null}
      {!token ? (
        <p className="text-sm text-muted-foreground">
          Open the reset link sent to your email, or request a new one.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}
      <Link
        href="/sign-in"
        className="block text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </AuthCard>
  );
}
