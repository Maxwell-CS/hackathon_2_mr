import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SEVERITIES,
  SIGNAL_STATUSES,
  SIGNAL_TYPES,
  type Signal,
} from "../api/types";
import {
  useInfiniteSignals,
  type SignalFilters,
} from "../hooks/useInfiniteSignals";
import { Modal } from "../components/Modal";
import { SignalDetail } from "../components/SignalDetail";
import { ErrorState, EmptyState } from "../components/States";
import { Spinner } from "../components/Spinner";
import { Badge } from "../components/Badge";
import { severityClass, statusClass, signalTypeLabel } from "../ui/theme";

// --- URL filter contract ----------------------------------------------------

function parseFilters(params: URLSearchParams): SignalFilters {
  const oneOf = (value: string | null, allowed: readonly string[]): string =>
    value && allowed.includes(value) ? value : "";

  return {
    signalType: oneOf(params.get("signalType"), SIGNAL_TYPES),
    severity: oneOf(params.get("severity"), SEVERITIES),
    status: oneOf(params.get("status"), SIGNAL_STATUSES),
    q: (params.get("q") ?? "").slice(0, 80),
  };
}

export function SignalsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const selectedId = searchParams.get("signal");

  const {
    items,
    hasMore,
    totalEstimate,
    loading,
    loadingMore,
    error,
    loadMore,
    retry,
    applySignalUpdate,
  } = useInfiniteSignals(filters);

  const setFilter = useCallback(
    (key: keyof SignalFilters, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          next.delete("signal"); // close any open detail when filters change
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const openDetail = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("signal", id);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const closeDetail = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("signal");
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  // The feed list stays mounted while the modal is open, so the scroll position
  // is preserved automatically when opening/closing the detail.

  // --- Auto-load via IntersectionObserver sentinel -----------------------
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Keep a stable callback ref so the observer always calls the latest loadMore.
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // Re-create the observer when the loaded count or hasMore changes. Re-observing
  // re-fires the callback with the current intersection state, so the feed keeps
  // loading even when the sentinel remains within view after a short page.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, hasMore]);

  const selectedSeed = useMemo<Signal | undefined>(
    () => items.find((s) => s.id === selectedId),
    [items, selectedId],
  );

  const hasActiveFilters =
    !!filters.signalType || !!filters.severity || !!filters.status || !!filters.q;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Feed de Señales
          </h1>
          <p className="text-sm text-slate-500">
            {totalEstimate > 0
              ? `≈ ${totalEstimate} señales · ${items.length} cargadas`
              : "Flujo de señales en tiempo de operación"}
          </p>
        </div>
      </header>

      {/* Filters ----------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-700 bg-ink-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Tipo"
          value={filters.signalType}
          onChange={(v) => setFilter("signalType", v)}
          options={SIGNAL_TYPES.map((t) => ({
            value: t,
            label: signalTypeLabel[t],
          }))}
        />
        <FilterSelect
          label="Severidad"
          value={filters.severity}
          onChange={(v) => setFilter("severity", v)}
          options={SEVERITIES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Estado"
          value={filters.status}
          onChange={(v) => setFilter("status", v)}
          options={SIGNAL_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <SearchFilter value={filters.q} onChange={(v) => setFilter("q", v)} />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              setSearchParams(new URLSearchParams(), { replace: false })
            }
            className="justify-self-start rounded-lg border border-ink-600 px-3 py-1.5 text-sm text-slate-400 transition hover:text-slate-100"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Feed -------------------------------------------------------------- */}
      {loading && items.length === 0 ? (
        <FeedSkeleton />
      ) : items.length === 0 && error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin señales"
          hint="No hay señales que coincidan con los filtros."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((signal) => (
            <li key={signal.id}>
              <SignalCard signal={signal} onOpen={() => openDetail(signal.id)} />
            </li>
          ))}
        </ul>
      )}

      {/* Infinite-scroll footer ------------------------------------------- */}
      {items.length > 0 && (
        <div className="py-4 text-center">
          {error ? (
            <div className="space-y-2">
              <p className="text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-rose-500/20 px-4 py-1.5 text-sm font-medium text-rose-200 ring-1 ring-inset ring-rose-500/40 hover:bg-rose-500/30"
              >
                Reintentar
              </button>
            </div>
          ) : loadingMore ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" /> Cargando más…
            </div>
          ) : hasMore ? (
            <span className="text-xs text-slate-600">Desplázate para más</span>
          ) : (
            <span className="text-xs text-slate-600">
              — Fin del feed · {items.length} señales —
            </span>
          )}
        </div>
      )}

      {/* Sentinel observed for auto-loading. Always rendered (no layout shift). */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {/* Detail modal — feed stays mounted, scroll is preserved ----------- */}
      <Modal
        open={!!selectedId}
        onClose={closeDetail}
        title="Detalle de la señal"
      >
        {selectedId && (
          <SignalDetail
            signalId={selectedId}
            seed={selectedSeed}
            onUpdated={applySignalUpdate}
          />
        )}
      </Modal>
    </div>
  );
}

// --- Components -------------------------------------------------------------

function SignalCard({
  signal,
  onOpen,
}: {
  signal: Signal;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-4 rounded-2xl border border-ink-700 bg-ink-900/40 p-4 text-left transition hover:border-brand-500/40 hover:bg-ink-800/40"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge className={statusClass[signal.status]}>{signal.status}</Badge>
          <Badge className={severityClass[signal.severity]}>
            {signal.severity}
          </Badge>
          <span className="text-xs font-medium text-slate-400">
            {signalTypeLabel[signal.signalType]}
          </span>
        </div>
        <p className="truncate text-sm text-slate-200">{signal.rawContent}</p>
        <p className="mt-1 text-xs text-slate-500">
          {signal.tropel.name} · {signal.tropel.species} ·{" "}
          {new Date(signal.createdAt).toLocaleString("es", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <svg
        className="mt-1 h-5 w-5 shrink-0 text-slate-600 transition group-hover:text-brand-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SearchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Local input debounced before hitting the URL / feed reset.
  const timer = useRef<number | undefined>(undefined);
  const handle = (v: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onChange(v), 400);
  };
  // Uncontrolled with key to reset when the URL value changes externally.
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Buscar
      </label>
      <input
        key={value}
        defaultValue={value}
        maxLength={80}
        onChange={(e) => handle(e.target.value)}
        placeholder="Contenido…"
        className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-ink-700 bg-ink-900/40 p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-3 w-48 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
