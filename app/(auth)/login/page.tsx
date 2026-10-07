import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in" };
export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(user.role === "CLIENT" ? "/dashboard" : "/developer");
  return (
    <>
      <span className="eyebrow">YOUR NEXT MILESTONE AWAITS</span>
      <h2>Welcome back.</h2>
      <p className="auth-description">Let’s pick up where you left off.</p>
      <AuthForm mode="login" />
    </>
  );
}
