import { ProjectWorkspace } from "@/components/project-workspace";
export const metadata = { title: "Project workspace" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectWorkspace id={id} />;
}
