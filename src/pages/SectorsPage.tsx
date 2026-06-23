import { useNavigate } from "react-router-dom";
import { useSectors } from "../hooks/useSectors";
import { ErrorState, EmptyState } from "../components/States";
import { climateLabel } from "../ui/theme";
import { withViewTransition } from "../utils/viewTransition";
import type { SectorListItem } from "../api/types";

export function SectorsPage() {
  const { sectors, loading, error } = useSectors();
  const navigate = useNavigate();

  // View Transition API: animate the jump from the summary card into the story.
  const goToStory = (id: string) => {
    withViewTransition(() => {
      navigate(`/sectors/${id}/story`);
    });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Sectores
        </h1>
        <p className="text-sm text-slate-500">
          Selecciona un sector para abrir su historia visual
        </p>
      </header>

      {error ? (
        <ErrorState message="No se pudieron cargar los sectores." />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-40 rounded-2xl border border-ink-700"
            />
          ))}
        </div>
      ) : sectors.length === 0 ? (
        <EmptyState title="Sin sectores" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              onOpen={() => goToStory(sector.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectorCard({
  sector,
  onOpen,
}: {
  sector: SectorListItem;
  onOpen: () => void;
}) {
  const loadPct = Math.round((sector.currentLoad / sector.capacity) * 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-ink-700 bg-ink-900/40 p-5 text-left transition hover:border-brand-500/40 hover:bg-ink-800/40"
      // Shared element name for the View Transition into the story header.
      style={{ viewTransitionName: `sector-${sector.id}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          {sector.sectorCode}
        </span>
        <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[11px] text-slate-400">
          {climateLabel[sector.climate]}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold text-slate-100">
        {sector.name}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Estabilidad
          </dt>
          <dd className="tabular-nums text-emerald-300">
            {sector.stabilityLevel}%
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Carga
          </dt>
          <dd className="tabular-nums text-slate-200">
            {sector.currentLoad}/{sector.capacity}
          </dd>
        </div>
      </dl>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
          style={{ width: `${Math.min(100, loadPct)}%` }}
        />
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-400">
        Abrir historia
        <svg
          className="h-4 w-4 transition group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
