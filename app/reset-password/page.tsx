import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/features/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
