"use client";
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  CsvExportModule,
  PinnedRowModule,
  RenderApiModule,
  RowAutoHeightModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from "ag-grid-community";
import { CalendarDays, Download, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatProjectCurrency,
  formatProjectDate,
  projectStatusLabel,
} from "@/lib/projects/list";
import type { ScheduleItem } from "@/lib/schedule/project";
import { DeveloperSchedule } from "./developer-schedule";
import "./project-list.css";

export type LedgerMilestoneRow = {
  id: string;
  step: string;
  title: string;
  stageLabel: string;
  estimatedDays: number;
  dueAt: string | null;
  amount: number;
  fundedAmount: number;
  refundedAmount: number;
  currency: string;
  verificationState: string;
  paypalReference: string;
  additionalScope: boolean;
  rowKind?: "milestone" | "summary";
};

const modules = [
  ClientSideRowModelModule,
  CellStyleModule,
  ColumnApiModule,
  CsvExportModule,
  PinnedRowModule,
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
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 600,
  spacing: 6,
  cellHorizontalPadding: 14,
  wrapperBorder: false,
  wrapperBorderRadius: 0,
});

const desktopQuery = "(min-width: 960px)";
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

function StepCell({ data }: ICellRendererParams<LedgerMilestoneRow>) {
  if (!data) return null;
  return data.rowKind === "summary" ? (
    <strong className="grid-summary-label">Σ</strong>
  ) : (
    <span className="milestone-number">{data.step}</span>
  );
}

function TitleCell({ data }: ICellRendererParams<LedgerMilestoneRow>) {
  if (!data) return null;
  if (data.rowKind === "summary") {
    return <strong className="grid-summary-label">{data.title}</strong>;
  }
  return (
    <div className="grid-project-primary">
      <a href={`#milestone-${data.id}`} className="grid-open-project">
        {data.title}
      </a>
      {data.additionalScope && (
        <span className="grid-project-counterparty">
          Approved scope addition
        </span>
      )}
    </div>
  );
}

function ScheduleWindowCell({ data }: ICellRendererParams<LedgerMilestoneRow>) {
  if (!data) return null;
  if (data.rowKind === "summary") {
    return (
      <span className="grid-project-date">
        {data.estimatedDays} total est. days
      </span>
    );
  }
  return (
    <div className="grid-budget-stack">
      <span>{data.estimatedDays} est. days</span>
      <span className="grid-funded-caption">
        {data.dueAt
          ? `Target: ${formatProjectDate(data.dueAt)} · UTC`
          : "Starts after funding"}
      </span>
    </div>
  );
}

function AmountCell({ data }: ICellRendererParams<LedgerMilestoneRow>) {
  if (!data) return null;
  return (
    <div className="grid-budget-stack">
      <strong>{formatProjectCurrency(data.amount, data.currency)}</strong>
      {data.rowKind === "summary" && (
        <span className="grid-funded-caption">
          {formatProjectCurrency(data.fundedAmount, data.currency)} verified
          {data.refundedAmount > 0
            ? ` · ${formatProjectCurrency(data.refundedAmount, data.currency)} refunded`
            : ""}
        </span>
      )}
    </div>
  );
}

function VerificationCell({ data }: ICellRendererParams<LedgerMilestoneRow>) {
  if (!data) return null;
  return (
    <div className="grid-budget-stack">
      <span>{data.verificationState}</span>
      {data.paypalReference && (
        <span className="grid-funded-caption">{data.paypalReference}</span>
      )}
    </div>
  );
}

function ProjectLedgerGrid({
  projectName,
  rows,
  scheduleItems,
  now,
  developer,
}: {
  projectName: string;
  rows: LedgerMilestoneRow[];
  scheduleItems: ScheduleItem[];
  now: string;
  developer: boolean;
}) {
  const apiRef = useRef<GridApi<LedgerMilestoneRow> | null>(null);
  const [activeTab, setActiveTab] = useState<"ledger" | "calendar">("ledger");
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    serverSnapshot,
  );

  const summaryRows = useMemo<LedgerMilestoneRow[]>(() => {
    if (!rows.length) return [];
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalFunded = rows.reduce((sum, r) => sum + r.fundedAmount, 0);
    const totalRefunded = rows.reduce((sum, r) => sum + r.refundedAmount, 0);
    const totalDays = rows.reduce((sum, r) => sum + r.estimatedDays, 0);
    const currency = rows[0]?.currency ?? "USD";
    return [
      {
        id: "ledger-summary",
        rowKind: "summary",
        step: "Σ",
        title: `Agreement total (${rows.length} milestones)`,
        stageLabel: `${rows.filter((r) => r.stageLabel === "Completed").length}/${rows.length} done`,
        estimatedDays: totalDays,
        dueAt: null,
        amount: totalAmount,
        fundedAmount: totalFunded,
        refundedAmount: totalRefunded,
        currency,
        verificationState: `${formatProjectCurrency(totalFunded, currency)} captured`,
        paypalReference:
          totalRefunded > 0
            ? `${formatProjectCurrency(totalRefunded, currency)} refunded`
            : "Server-verified PayPal ledger",
        additionalScope: false,
      },
    ];
  }, [rows]);

  const exportCsv = useCallback(() => {
    apiRef.current?.exportDataAsCsv({
      fileName: `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ledger.csv`,
    });
  }, [projectName]);

  const columns = useMemo<ColDef<LedgerMilestoneRow>[]>(
    () => [
      {
        field: "step",
        headerName: "#",
        width: 68,
        minWidth: 64,
        sortable: false,
        cellRenderer: StepCell,
      },
      {
        field: "title",
        headerName: "Milestone",
        minWidth: 180,
        flex: 1.3,
        wrapText: true,
        autoHeight: true,
        cellRenderer: TitleCell,
      },
      {
        field: "stageLabel",
        headerName: "Stage",
        width: 140,
        minWidth: 128,
        cellClass: "grid-project-date",
      },
      {
        colId: "window",
        field: "estimatedDays",
        headerName: "Window · UTC",
        width: 165,
        minWidth: 150,
        cellRenderer: ScheduleWindowCell,
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 148,
        minWidth: 136,
        cellRenderer: AmountCell,
        cellClass: "grid-project-date",
      },
      {
        field: "verificationState",
        headerName: "PayPal Sandbox record",
        minWidth: 195,
        flex: 1.15,
        wrapText: true,
        autoHeight: true,
        cellRenderer: VerificationCell,
      },
    ],
    [],
  );

  const defaults = useMemo<ColDef<LedgerMilestoneRow>>(
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
    <section
      className="editor-section project-ledger-section"
      aria-label="Milestone ledger and schedule"
    >
      <div className="panel-heading inline-panel project-workbench-header">
        <div>
          <h2>Milestone ledger &amp; schedule</h2>
          <p className="field-hint">
            Inspect financial verification in AG Grid or switch to the Bryntum
            schedule view for this agreement.
          </p>
        </div>
        <div
          className="project-workbench-tabs"
          role="tablist"
          aria-label="Project data views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ledger"}
            className={`workbench-tab ${activeTab === "ledger" ? "active" : ""}`}
            onClick={() => setActiveTab("ledger")}
          >
            <Table2 size={15} aria-hidden="true" /> Financial ledger
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "calendar"}
            className={`workbench-tab ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <CalendarDays size={15} aria-hidden="true" /> Schedule calendar
          </button>
        </div>
      </div>

      {activeTab === "ledger" ? (
        desktop ? (
          <div className="project-grid project-ledger-grid">
            <div className="project-grid-bar">
              <p className="project-grid-hint">
                Select any milestone title to jump to its controls below, sort
                by amount or duration, or export this ledger to CSV.
              </p>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={exportCsv}
              >
                <Download size={14} aria-hidden="true" /> Export ledger CSV
              </Button>
            </div>
            <AgGridProvider modules={modules}>
              <AgGridReact<LedgerMilestoneRow>
                theme={theme}
                onGridReady={({ api }) => {
                  apiRef.current = api;
                  api.setGridAriaProperty("label", "Milestone payment ledger");
                }}
                rowData={rows}
                pinnedBottomRowData={summaryRows}
                columnDefs={columns}
                defaultColDef={defaults}
                getRowId={({ data }) => data.id}
                domLayout="autoHeight"
                headerHeight={42}
                rowHeight={68}
                suppressMovableColumns
                suppressMultiSort
                ensureDomOrder
                suppressColumnVirtualisation
                enableCellTextSelection
                animateRows={false}
              />
            </AgGridProvider>
          </div>
        ) : (
          <div className="ledger-mobile-list">
            {rows.map((r) => (
              <div key={r.id} className="ledger-mobile-item">
                <div>
                  <span className="milestone-number">{r.step}</span>{" "}
                  <a href={`#milestone-${r.id}`} className="grid-open-project">
                    {r.title}
                  </a>
                </div>
                <p className="project-row-meta">
                  <span>{formatProjectCurrency(r.amount, r.currency)}</span>
                  <span>· {r.estimatedDays} est. days</span>
                  <span>· {r.verificationState}</span>
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="project-embedded-calendar">
          <DeveloperSchedule
            items={scheduleItems}
            now={now}
            clientView={!developer}
            embedded
          />
        </div>
      )}
    </section>
  );
}

export default memo(ProjectLedgerGrid);
export { projectStatusLabel };
