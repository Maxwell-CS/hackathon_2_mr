import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { getTropels, type TropelQuery } from "../api/endpoints";
import { ApiError } from "../api/client";
import {
  SPECIES,
  VITAL_STATES,
  type PagedTropels,
  type Tropel,
} from "../api/types";
import { describeError } from "../utils/errors";
import { useDebounce } from "../hooks/useDebounce";
import { useSectors } from "../hooks/useSectors";
import { ErrorState, EmptyState } from "../components/States";
import { Badge } from "../components/Badge";
import { vitalStateClass } from "../ui/theme";

// --- URL <-> state contract -------------------------------------------------

const ALLOWED_SIZES = [10, 20, 50] as const;
const ALLOWED_SORTS = ["name,asc", "updatedAt,desc", "chaosIndex,desc"] as const;
type AllowedSort = (typeof ALLOWED_SORTS)[number];

interface TropelState {
  page: number;
  size: number;
  species: string;
  vitalState: string;
  sectorId: string;
  q: string;
  sort: AllowedSort;
}

function parseState(params: URLSearchParams): TropelState {
  const rawSize = Number(params.get("size"));
  const size = ALLOWED_SIZES.includes(rawSize as 10 | 20 | 50) ? rawSize : 20;

  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;

  const rawSort = params.get("sort") ?? "";
  const sort = (ALLOWED_SORTS as readonly string[]).includes(rawSort)
    ? (rawSort as AllowedSort)
    : "updatedAt,desc";

  const speciesVal = params.get("species") ?? "";
  const species = (SPECIES as readonly string[]).includes(speciesVal)
    ? speciesVal
    : "";

  const vitalVal = params.get("vitalState") ?? "";
  const vitalState = (VITAL_STATES as readonly string[]).includes(vitalVal)
    ? vitalVal
    : "";

  return {
    page,
    size,
    species,
    vitalState,
    sectorId: params.get("sectorId") ?? "",
    q: (params.get("q") ?? "").slice(0, 80),
    sort,
  };
}

function stateToParams(s: TropelState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.page !== 0) p.set("page", String(s.page));
  if (s.size !== 20) p.set("size", String(s.size));
  if (s.species) p.set("species", s.species);
  if (s.vitalState) p.set("vitalState", s.vitalState);
  if (s.sectorId) p.set("sectorId", s.sectorId);
  if (s.q) p.set("q", s.q);
  if (s.sort !== "updatedAt,desc") p.set("sort", s.sort);
  return p;
}

// ---------------------------------------------------------------------------

export function TropelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseState(searchParams), [searchParams]);
  const { sectors } = useSectors();

  const patchState = useCallback(
    (patch: Partial<TropelState>) => {
      setSearchParams(
        (prev) => {
          const next = { ...parseState(prev), ...patch };
          return stateToParams(next);
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  // Local search box value, debounced before it touches the URL so typing
  // doesn't spam requests or history entries.
  const [searchInput, setSearchInput] = useState(state.q);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Keep the input in sync when the URL changes externally (back/forward/share).
  const lastSyncedQ = useRef(state.q);
  useEffect(() => {
    if (state.q !== lastSyncedQ.current) {
      lastSyncedQ.current = state.q;
      setSearchInput(state.q);
    }
  }, [state.q]);

  // Push debounced search into the URL (resetting to page 0).
  useEffect(() => {
    if (debouncedSearch === state.q) return;
    lastSyncedQ.current = debouncedSearch;
    patchState({ q: debouncedSearch, page: 0 });
  }, [debouncedSearch, state.q, patchState]);

  // --- Data fetching with stale-response protection ------------------------

  const [data, setData] = useState<PagedTropels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const query: TropelQuery = useMemo(
    () => ({
      page: state.page,
      size: state.size,
      species: state.species || undefined,
      vitalState: state.vitalState || undefined,
      sectorId: state.sectorId || undefined,
      q: state.q || undefined,
      sort: state.sort,
    }),
    [state],
  );

  const fetchData = useCallback(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getTropels(query, controller.signal)
      .then((res) => {
        // Ignore any response that isn't from the latest request.
        if (seq !== requestSeq.current) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (ApiError.isAbort(err) || seq !== requestSeq.current) return;
        setError(describeError(err));
        setLoading(false);
      });

    return controller;
  }, [query]);

  useEffect(() => {
    const controller = fetchData();
    return () => controller.abort();
  }, [fetchData]);

  const hasFilters =
    !!state.species ||
    !!state.vitalState ||
    !!state.sectorId ||
    !!state.q;

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Atlas de Tropeles
          </h1>
          <p className="text-sm text-slate-500">
            {data
              ? `${data.totalElements} criaturas registradas`
              : "Cargando inventario…"}
          </p>
        </div>
      </header>

      {/* Filters ----------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-700 bg-ink-900/40 p-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <FilterLabel>Buscar</FilterLabel>
          <input
            value={searchInput}
            maxLength={80}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nombre del Tropel…"
            className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="lg:col-span-2">
          <FilterLabel>Especie</FilterLabel>
          <Select
            value={state.species}
            onChange={(v) => patchState({ species: v, page: 0 })}
            options={[{ value: "", label: "Todas" }].concat(
              SPECIES.map((s) => ({ value: s, label: s })),
            )}
          />
        </div>

        <div className="lg:col-span-2">
          <FilterLabel>Estado vital</FilterLabel>
          <Select
            value={state.vitalState}
            onChange={(v) => patchState({ vitalState: v, page: 0 })}
            options={[{ value: "", label: "Todos" }].concat(
              VITAL_STATES.map((s) => ({ value: s, label: s })),
            )}
          />
        </div>

        <div className="lg:col-span-2">
          <FilterLabel>Sector</FilterLabel>
          <Select
            value={state.sectorId}
            onChange={(v) => patchState({ sectorId: v, page: 0 })}
            options={[{ value: "", label: "Todos" }].concat(
              sectors.map((s) => ({
                value: s.id,
                label: `${s.sectorCode} · ${s.name}`,
              })),
            )}
          />
        </div>

        <div className="lg:col-span-2">
          <FilterLabel>Ordenar</FilterLabel>
          <Select
            value={state.sort}
            onChange={(v) => patchState({ sort: v as AllowedSort, page: 0 })}
            options={[
              { value: "updatedAt,desc", label: "Actualizado ↓" },
              { value: "name,asc", label: "Nombre A→Z" },
              { value: "chaosIndex,desc", label: "Caos ↓" },
            ]}
          />
        </div>

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-12">
          <div>
            <FilterLabel>Por página</FilterLabel>
            <Select
              value={String(state.size)}
              onChange={(v) => patchState({ size: Number(v), page: 0 })}
              options={ALLOWED_SIZES.map((s) => ({
                value: String(s),
                label: String(s),
              }))}
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchParams(new URLSearchParams(), { replace: false });
              }}
              className="ml-auto rounded-lg border border-ink-600 px-3 py-2 text-sm text-slate-400 transition hover:text-slate-100"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results ----------------------------------------------------------- */}
      <div className="relative">
        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading && !data ? (
          <TableSkeleton rows={state.size > 10 ? 10 : state.size} />
        ) : data && data.content.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            hint="Ajusta los filtros o limpia la búsqueda."
          />
        ) : (
          <div
            className={`overflow-hidden rounded-2xl border border-ink-700 transition-opacity ${
              loading ? "opacity-60" : "opacity-100"
            }`}
            aria-busy={loading}
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-900/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tropel</th>
                  <th className="px-4 py-3 font-medium">Especie</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Sector
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Caos</th>
                  <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                    Energía
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Guardián
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data?.content.map((t) => (
                  <TropelRow key={t.id} tropel={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination -------------------------------------------------------- */}
      {data && data.content.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Página {data.currentPage + 1} de {Math.max(1, totalPages)} ·{" "}
            {data.totalElements} resultados
          </p>
          <div className="flex items-center gap-2">
            <PageButton
              disabled={state.page <= 0}
              onClick={() => patchState({ page: 0 })}
            >
              «
            </PageButton>
            <PageButton
              disabled={state.page <= 0}
              onClick={() => patchState({ page: state.page - 1 })}
            >
              Anterior
            </PageButton>
            <PageButton
              disabled={state.page >= totalPages - 1}
              onClick={() => patchState({ page: state.page + 1 })}
            >
              Siguiente
            </PageButton>
            <PageButton
              disabled={state.page >= totalPages - 1}
              onClick={() => patchState({ page: Math.max(0, totalPages - 1) })}
            >
              »
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Small building blocks --------------------------------------------------

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-brand-500/40 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TropelRow({ tropel }: { tropel: Tropel }) {
  return (
    <tr className="bg-ink-900/30 transition hover:bg-ink-800/40">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-100">{tropel.name}</div>
        <div className="text-xs text-slate-500">
          mutación · etapa {tropel.mutationStage}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">{tropel.species}</td>
      <td className="px-4 py-3">
        <Badge className={vitalStateClass[tropel.vitalState]}>
          {tropel.vitalState}
        </Badge>
      </td>
      <td className="hidden px-4 py-3 text-slate-300 sm:table-cell">
        <span className="text-xs text-slate-500">
          {tropel.sector.sectorCode}
        </span>{" "}
        {tropel.sector.name}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-200">
        {tropel.chaosIndex}
      </td>
      <td className="hidden px-4 py-3 text-right tabular-nums text-slate-300 md:table-cell">
        {tropel.energyLevel}
      </td>
      <td className="hidden px-4 py-3 text-slate-300 lg:table-cell">
        {tropel.guardianName}
      </td>
    </tr>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-700">
      <div className="bg-ink-900/60 px-4 py-3">
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="divide-y divide-ink-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-ink-900/30 px-4 py-3.5">
            <div className="skeleton h-9 flex-1 rounded" />
            <div className="skeleton hidden h-9 w-24 rounded sm:block" />
            <div className="skeleton h-9 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
