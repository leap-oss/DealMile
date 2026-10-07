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
      <span className="eyebrow">START ON THE SAME PAGE</span>
      <h2>Make room for great work.</h2>
      <p className="auth-description">Create your DealMile workspace.</p>
      <AuthForm
        mode="register"
        defaultRole={role === "DEVELOPER" ? "DEVELOPER" : "CLIENT"}
      />
    </>
  );
}
