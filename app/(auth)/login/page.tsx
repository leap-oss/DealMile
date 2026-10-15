import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in" };
export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.role === "CLIENT" ? "/dashboard" : "/developer");
  return (
    <>
      <span className="eyebrow">YOUR PROJECT WORKSPACE</span>
      <h1>Welcome back.</h1>
      <p className="auth-description">
        Log in to review your projects, agreements, and next steps.
      </p>
      <AuthForm mode="login" />
    </>
  );
}
