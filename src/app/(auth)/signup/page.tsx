import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
