"use client";
import { memo, useMemo } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  PaginationModule,
  RowAutoHeightModule,
  RenderApiModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type SuppressKeyboardEventParams,
} from "ag-grid-community";
import { ArrowRight } from "lucide-react";
import { PendingLink } from "@/components/ui/pending-link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatProjectDate,
  projectStatusLabel,
  type ProjectGridRow,
  type ProjectSort,
} from "@/lib/projects/list";

const modules = [
  ClientSideRowModelModule,
  CellStyleModule,
  ColumnApiModule,
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
function StatusCell({ data }: ICellRendererParams<ProjectGridRow>) {
  return data ? <StatusBadge status={data.status} /> : null;
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
  const columns = useMemo<ColDef<ProjectGridRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Project",
        minWidth: 180,
        flex: 1.1,
        wrapText: true,
        autoHeight: true,
        cellClass: "grid-project-name",
        sort: sort.field === "name" ? sort.direction : null,
      },
      {
        field: "status",
        headerName: "Status",
        width: 170,
        minWidth: 150,
        wrapText: true,
        autoHeight: true,
        cellRenderer: StatusCell,
        comparator: (left, right) =>
          projectStatusLabel(left).localeCompare(projectStatusLabel(right)),
        sort: sort.field === "status" ? sort.direction : null,
      },
      {
        field: "nextStep",
        headerName: "Next step",
        minWidth: 240,
        flex: 1.5,
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
        width: 150,
        minWidth: 150,
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
      resizable: false,
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
      <p className="project-grid-hint">
        Sort with the Project, Status, or Updated column headings. Use Open
        project to view details.
        <span> Scroll horizontally if more columns are off-screen.</span>
      </p>
      <AgGridProvider modules={modules}>
        <AgGridReact<ProjectGridRow>
          theme={theme}
          onGridReady={({ api }) =>
            api.setGridAriaProperty("label", "Recent projects")
          }
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
              ["name", "status", "updatedAt"].includes(selected.colId)
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
