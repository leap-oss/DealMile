import type { ProjectStatus } from "@prisma/client";
export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  updatedAt: string;
  counterparty?: string;
  budgetAmount?: number;
  fundedAmount?: number;
  currency?: string;
  completedMilestones?: number;
  totalMilestones?: number;
  deadline?: string;
  paymentHold?: boolean;
};
export type ProjectGridRow = ProjectListItem & {
  nextStep: string;
  href: string;
  rowKind?: "project" | "summary";
};
export type ProjectSort = {
  field: "name" | "status" | "updatedAt" | "budgetAmount" | "deadline";
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
export function formatProjectCurrency(amount = 0, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
export function projectStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}
