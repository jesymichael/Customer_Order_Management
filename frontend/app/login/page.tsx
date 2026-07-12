import { AuthCard } from "@/components/auth-card";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard mode="login" />
    </AuthLayout>
  );
}
