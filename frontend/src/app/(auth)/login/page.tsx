import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
