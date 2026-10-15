import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account" };
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await getUser();
  if (user) redirect(user.role === "CLIENT" ? "/dashboard" : "/developer");
  const { role } = await searchParams;
  return (
    <>
      <span className="eyebrow">START WITH A CLEAR AGREEMENT</span>
      <h1>Create your workspace.</h1>
      <p className="auth-description">
        Choose your role, then create an account to start planning or reviewing
        project work.
      </p>
      <AuthForm
        mode="register"
        defaultRole={role === "DEVELOPER" ? "DEVELOPER" : "CLIENT"}
      />
    </>
  );
}
