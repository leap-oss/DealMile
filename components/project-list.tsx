"use client";
import {
  Component,
  Suspense,
  lazy,
  useId,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowRight, FileText, Search } from "lucide-react";
import {
  formatProjectDate,
  projectStatusLabel,
  type ProjectListItem,
  type ProjectGridRow,
  type ProjectSort,
} from "@/lib/projects/list";
import { PendingLink } from "@/components/ui/pending-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { projectNextStep } from "@/lib/projects/next-step";
import "./project-list.css";

const ProjectGrid = lazy(() => import("./project-grid"));
const projectCollator = new Intl.Collator("en-US", { numeric: true });
const desktopQuery = "(min-width: 1100px)";
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

class GridBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <div className="project-grid-error" role="alert">
          <p>
            The project table could not load. You can still open your projects
            below.
          </p>
          <Button
            variant="outline"
            size="small"
            onClick={() => window.location.reload()}
          >
            Reload table
          </Button>
        </div>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}
function ProjectRows({ rows }: { rows: ProjectGridRow[] }) {
  return (
    <div className="project-list-rows">
      {rows.map((project) => (
        <PendingLink
          href={project.href}
          className="project-row"
          pendingLabel="Opening project…"
          key={project.id}
        >
          <FileText size={20} aria-hidden="true" />
          <div className="project-row-copy">
            <strong>{project.name}</strong>
            <p>{project.nextStep}</p>
          </div>
          <StatusBadge status={project.status} />
          <time dateTime={project.updatedAt}>
            Updated {formatProjectDate(project.updatedAt)} · UTC
          </time>
          <span className="project-row-action">
            Open project <ArrowRight size={15} aria-hidden="true" />
          </span>
        </PendingLink>
      ))}
    </div>
  );
}
export function ProjectList({
  projects,
  developer,
}: {
  projects: ProjectListItem[];
  developer: boolean;
}) {
  const id = useId();
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    serverSnapshot,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<ProjectSort>({
    field: "updatedAt",
    direction: "desc",
  });
  const deferredSearch = useDeferredValue(search);
  const statuses = useMemo(
    () => [...new Set(projects.map((project) => project.status))].sort(),
    [projects],
  );
  const rows = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("en-US");
    return projects
      .filter(
        (project) =>
          (status === "all" || project.status === status) &&
          project.name.toLocaleLowerCase("en-US").includes(query),
      )
      .map((project) => ({
        ...project,
        nextStep: projectNextStep(project.status, developer),
        href: `${developer ? "/developer/projects" : "/projects"}/${project.id}`,
      }))
      .sort((left, right) => {
        const comparison = projectCollator.compare(
          left[sort.field],
          right[sort.field],
        );
        return (
          (sort.direction === "asc" ? comparison : -comparison) ||
          left.id.localeCompare(right.id)
        );
      });
  }, [projects, developer, deferredSearch, status, sort]);
  const changeSort = useCallback((next: ProjectSort) => {
    setSort((previous) =>
      previous.field === next.field && previous.direction === next.direction
        ? previous
        : next,
    );
  }, []);
  function clearFilters() {
    setSearch("");
    setStatus("all");
  }
  const list = <ProjectRows rows={rows} />;
  return (
    <div className="project-list">
      <div className="project-list-toolbar">
        <div className="form-field project-search">
          <label htmlFor={`${id}-search`}>Search projects</label>
          <div className="project-search-input">
            <Search size={17} aria-hidden="true" />
            <input
              id={`${id}-search`}
              type="search"
              placeholder="Project name"
              autoComplete="off"
              spellCheck={false}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-status`}>Project status</label>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {projectStatusLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field project-sort">
          <label htmlFor={`${id}-sort`}>Sort projects</label>
          <select
            id={`${id}-sort`}
            value={`${sort.field}:${sort.direction}`}
            onChange={(event) => {
              const [field, direction] = event.target.value.split(":");
              changeSort({
                field: field as ProjectSort["field"],
                direction: direction as ProjectSort["direction"],
              });
            }}
          >
            <option value="updatedAt:desc">Recently updated</option>
            <option value="updatedAt:asc">Oldest updated</option>
            <option value="name:asc">Project name A–Z</option>
            <option value="name:desc">Project name Z–A</option>
            <option value="status:asc">Status A–Z</option>
            <option value="status:desc">Status Z–A</option>
          </select>
        </div>
        {(search || status !== "all") && (
          <Button
            type="button"
            size="small"
            variant="outline"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>
      <p className="project-list-count" role="status">
        {rows.length} of {projects.length} recent projects
        {projects.length === 20
          ? ". Search and filters apply to the latest 20 projects."
          : "."}
      </p>
      {rows.length ? (
        desktop ? (
          <GridBoundary fallback={list}>
            <Suspense
              fallback={
                <>
                  <p className="project-grid-loading" role="status">
                    Loading project table. Your project links are ready below.
                  </p>
                  {list}
                </>
              }
            >
              <ProjectGrid rows={rows} sort={sort} onSortChange={changeSort} />
            </Suspense>
          </GridBoundary>
        ) : (
          list
        )
      ) : (
        <div className="project-search-empty">
          <h3>No projects match your filters</h3>
          <p>Try another project name or choose a different status.</p>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
