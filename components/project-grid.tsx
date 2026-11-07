"use client";
import { memo, useCallback, useMemo, useRef } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  CsvExportModule,
  PaginationModule,
  RowAutoHeightModule,
  RenderApiModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type SuppressKeyboardEventParams,
} from "ag-grid-community";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingLink } from "@/components/ui/pending-link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatProjectCurrency,
  formatProjectDate,
  projectStatusLabel,
  type ProjectGridRow,
  type ProjectSort,
} from "@/lib/projects/list";

const modules = [
  ClientSideRowModelModule,
  CellStyleModule,
  ColumnApiModule,
  CsvExportModule,
  PaginationModule,
  RowAutoHeightModule,
  RenderApiModule,
];
const theme = themeQuartz.withParams({
  accentColor: "var(--accent)",
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--foreground)",
  headerBackgroundColor: "var(--surface-subtle)",
  headerTextColor: "var(--muted)",
  borderColor: "var(--border)",
  rowHoverColor: "var(--accent-soft)",
  fontFamily: "inherit",
  fontSize: 14,
  headerFontSize: 12,
  headerFontWeight: 600,
  spacing: 6,
  cellHorizontalPadding: 16,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
});
function ProjectNameCell({ data }: ICellRendererParams<ProjectGridRow>) {
  if (!data) return null;
  return (
    <div className="grid-project-primary">
      <strong>{data.name}</strong>
      {data.counterparty && (
        <span className="grid-project-counterparty">{data.counterparty}</span>
      )}
    </div>
  );
}
function StatusCell({ data }: ICellRendererParams<ProjectGridRow>) {
  if (!data) return null;
  return (
    <div className="grid-status-stack">
      <StatusBadge status={data.status} />
      {data.paymentHold && (
        <span className="grid-hold-pill">Payments paused</span>
      )}
    </div>
  );
}
function MilestoneProgressCell({ data }: ICellRendererParams<ProjectGridRow>) {
  if (!data) return null;
  const completed = data.completedMilestones ?? 0;
  const total = data.totalMilestones ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="grid-milestone-progress">
      <span className="grid-milestone-count">
        {completed} / {total} completed
      </span>
      <span className="grid-progress-track" aria-hidden="true">
        <span
          className="grid-progress-fill"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </span>
    </div>
  );
}
function BudgetCell({ data }: ICellRendererParams<ProjectGridRow>) {
  if (!data) return null;
  const currency = data.currency ?? "USD";
  const budget = data.budgetAmount ?? 0;
  const funded = data.fundedAmount ?? 0;
  return (
    <div className="grid-budget-stack">
      <strong>{formatProjectCurrency(budget, currency)}</strong>
      <span className="grid-funded-caption">
        {funded > 0
          ? `${formatProjectCurrency(funded, currency)} verified`
          : "No verified capture yet"}
      </span>
    </div>
  );
}
function OpenProjectCell({ data }: ICellRendererParams<ProjectGridRow>) {
  return data ? (
    <PendingLink
      className="grid-open-project"
      href={data.href}
      aria-label={`Open project: ${data.name}`}
      pendingLabel="Opening…"
    >
      Open project <ArrowRight size={14} aria-hidden="true" />
    </PendingLink>
  ) : null;
}
/** Keep AG Grid's arrow navigation while allowing Tab and Enter into the real link. */
function actionKeyboard({
  event,
}: SuppressKeyboardEventParams<ProjectGridRow>) {
  const target = event.target as HTMLElement;
  const cell = target.closest<HTMLElement>(".ag-cell");
  const link = cell?.querySelector<HTMLAnchorElement>("a[href]");
  if (!link) return false;
  if (event.key === "Tab" && target === cell) {
    event.preventDefault();
    link.focus();
    return true;
  }
  if (event.key === "Enter") {
    if (target === cell) {
      event.preventDefault();
      link.click();
    }
    return true;
  }
  return false;
}
function ProjectGrid({
  rows,
  sort,
  onSortChange,
}: {
  rows: ProjectGridRow[];
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}) {
  const apiRef = useRef<GridApi<ProjectGridRow> | null>(null);
  const portfolioSummary = useMemo(() => {
    const totalBudget = rows.reduce((sum, r) => sum + (r.budgetAmount ?? 0), 0);
    const totalFunded = rows.reduce((sum, r) => sum + (r.fundedAmount ?? 0), 0);
    const completedMilestones = rows.reduce(
      (sum, r) => sum + (r.completedMilestones ?? 0),
      0,
    );
    const totalMilestones = rows.reduce(
      (sum, r) => sum + (r.totalMilestones ?? 0),
      0,
    );
    return {
      currency: rows[0]?.currency ?? "USD",
      totalBudget,
      totalFunded,
      completedMilestones,
      totalMilestones,
    };
  }, [rows]);
  const exportCsv = useCallback(() => {
    apiRef.current?.exportDataAsCsv({
      fileName: "dealmile-projects.csv",
      columnKeys: [
        "name",
        "status",
        "milestones",
        "budgetAmount",
        "deadline",
        "nextStep",
        "updatedAt",
      ],
      processCellCallback: (params) => {
        const row = params.node?.data;
        if (!row) return "";
        switch (params.column.getColId()) {
          case "name":
            return row.counterparty
              ? `${row.name} (${row.counterparty})`
              : row.name;
          case "status":
            return projectStatusLabel(row.status);
          case "milestones":
            return `${row.completedMilestones ?? 0}/${row.totalMilestones ?? 0}`;
          case "budgetAmount":
            return formatProjectCurrency(
              row.budgetAmount ?? 0,
              row.currency ?? "USD",
            );
          case "deadline":
            return row.deadline ? formatProjectDate(row.deadline) : "";
          case "updatedAt":
            return row.updatedAt ? formatProjectDate(row.updatedAt) : "";
          default:
            return String(params.value ?? "");
        }
      },
    });
  }, []);
  const columns = useMemo<ColDef<ProjectGridRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Project",
        minWidth: 180,
        flex: 1.2,
        wrapText: true,
        autoHeight: true,
        cellClass: "grid-project-name",
        cellRenderer: ProjectNameCell,
        sort: sort.field === "name" ? sort.direction : null,
      },
      {
        field: "status",
        headerName: "Status",
        width: 165,
        minWidth: 150,
        wrapText: true,
        autoHeight: true,
        cellRenderer: StatusCell,
        comparator: (left, right) =>
          projectStatusLabel(left).localeCompare(projectStatusLabel(right)),
        sort: sort.field === "status" ? sort.direction : null,
      },
      {
        colId: "milestones",
        headerName: "Milestones",
        width: 148,
        minWidth: 136,
        sortable: false,
        cellRenderer: MilestoneProgressCell,
      },
      {
        field: "budgetAmount",
        headerName: "Budget · Funded",
        width: 164,
        minWidth: 148,
        cellRenderer: BudgetCell,
        cellClass: "grid-project-date",
        sort: sort.field === "budgetAmount" ? sort.direction : null,
      },
      {
        field: "deadline",
        headerName: "Deadline · UTC",
        width: 136,
        minWidth: 125,
        valueFormatter: ({ value }) => (value ? formatProjectDate(value) : ""),
        sort: sort.field === "deadline" ? sort.direction : null,
        cellClass: "grid-project-date",
      },
      {
        field: "nextStep",
        headerName: "Next step",
        minWidth: 220,
        flex: 1.35,
        wrapText: true,
        autoHeight: true,
        sortable: false,
        cellClass: "grid-next-step",
      },
      {
        field: "updatedAt",
        headerName: "Updated · UTC",
        width: 136,
        minWidth: 125,
        valueFormatter: ({ value }) => (value ? formatProjectDate(value) : ""),
        sort: sort.field === "updatedAt" ? sort.direction : null,
        cellClass: "grid-project-date",
      },
      {
        colId: "action",
        headerName: "Action",
        width: 162,
        minWidth: 152,
        sortable: false,
        cellRenderer: OpenProjectCell,
        suppressKeyboardEvent: actionKeyboard,
      },
    ],
    [sort],
  );
  const defaults = useMemo<ColDef<ProjectGridRow>>(
    () => ({
      sortable: true,
      editable: false,
      resizable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      unSortIcon: true,
      sortingOrder: ["asc", "desc"],
      suppressHeaderMenuButton: true,
    }),
    [],
  );
  return (
    <div className="project-grid" aria-label="Recent projects table">
      <div className="project-grid-bar">
        <p className="project-grid-hint">
          Sort by Project, Status, Budget, Deadline, or Updated column headings.
          Use Open project to view details.
          <span> Scroll horizontally if more columns are off-screen.</span>
        </p>
        <div className="project-grid-bar-actions">
          <span className="project-grid-totals">
            Total:{" "}
            <strong>
              {formatProjectCurrency(
                portfolioSummary.totalBudget,
                portfolioSummary.currency,
              )}
            </strong>{" "}
            · Verified:{" "}
            <strong>
              {formatProjectCurrency(
                portfolioSummary.totalFunded,
                portfolioSummary.currency,
              )}
            </strong>{" "}
            · Milestones:{" "}
            <strong>
              {portfolioSummary.completedMilestones}/
              {portfolioSummary.totalMilestones}
            </strong>
          </span>
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={exportCsv}
          >
            <Download size={14} aria-hidden="true" /> Export CSV
          </Button>
        </div>
      </div>
      <AgGridProvider modules={modules}>
        <AgGridReact<ProjectGridRow>
          theme={theme}
          onGridReady={({ api }) => {
            apiRef.current = api;
            api.setGridAriaProperty("label", "Recent projects");
          }}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={defaults}
          getRowId={({ data }) => data.id}
          domLayout="autoHeight"
          headerHeight={44}
          rowHeight={76}
          pagination={rows.length > 10}
          paginationPageSize={10}
          paginationPageSizeSelector={false}
          suppressMovableColumns
          suppressMultiSort
          ensureDomOrder
          suppressColumnVirtualisation
          enableCellTextSelection
          animateRows={false}
          onSortChanged={({ api }) => {
            const selected = api.getColumnState().find((column) => column.sort);
            if (
              selected &&
              [
                "name",
                "status",
                "budgetAmount",
                "deadline",
                "updatedAt",
              ].includes(selected.colId)
            )
              onSortChange({
                field: selected.colId as ProjectSort["field"],
                direction: selected.sort as ProjectSort["direction"],
              });
          }}
        />
      </AgGridProvider>
    </div>
  );
}

export default memo(ProjectGrid);
