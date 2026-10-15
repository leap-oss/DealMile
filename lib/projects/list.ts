import type { ProjectStatus } from "@prisma/client";
export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  updatedAt: string;
};
export type ProjectGridRow = ProjectListItem & {
  nextStep: string;
  href: string;
};
export type ProjectSort = {
  field: "name" | "status" | "updatedAt";
  direction: "asc" | "desc";
};
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
export const formatProjectDate = (value: string) =>
  dateFormat.format(new Date(value));
export function projectStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}
