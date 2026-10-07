import { ProjectWorkspace } from "@/components/project-workspace";
export const metadata = { title: "Review project" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectWorkspace id={id} developer />;
}
