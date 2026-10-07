import { requireUser } from "@/lib/auth/session";
import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Client workspace" };
export default async function Page() {
  return <Dashboard user={await requireUser("CLIENT")} />;
}
