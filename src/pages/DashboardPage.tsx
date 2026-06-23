import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { DashboardSummary, Severity } from "../api/types";
import { SEVERITIES } from "../api/types";
import { describeError } from "../utils/errors";
import { ErrorState } from "../components/States";
import { severityClass } from "../ui/theme";

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    return getDashboardSummary(signal)
      .then((summary) => {
        setData(summary);
        setLoading(false);
      })
      .catch((err) => {
        if (ApiError.isAbort(err)) return;
        setError(describeError(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const maxSeverity = data
    ? Math.max(1, ...SEVERITIES.map((s) => data.signalsBySeverity[s]))
    : 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Indicadores globales del workspace
          </p>
        </div>
        {data && (
          <p className="text-xs text-slate-600">
            Actualizado{" "}
            {new Date(data.generatedAt).toLocaleTimeString("es", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}
      </header>

      {error && !data ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Tropeles totales"
              value={data?.totalTropels}
              loading={loading && !data}
              accent="text-brand-300"
            />
            <Kpi
              label="Tropeles críticos"
              value={data?.criticalTropels}
              loading={loading && !data}
              accent="text-rose-300"
            />
            <Kpi
              label="Señales abiertas"
              value={data?.openSignals}
              loading={loading && !data}
              accent="text-amber-300"
            />
            <Kpi
              label="Estabilidad media"
              value={data?.sectorStabilityAvg}
              suffix="%"
              loading={loading && !data}
              accent="text-emerald-300"
            />
          </div>

          <section className="rounded-2xl border border-ink-700 bg-ink-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">
              Señales por severidad
            </h2>
            {loading && !data ? (
              <div className="space-y-3">
                {SEVERITIES.map((s) => (
                  <div key={s} className="skeleton h-7 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {SEVERITIES.map((severity) => (
                  <SeverityBar
                    key={severity}
                    severity={severity}
                    value={data?.signalsBySeverity[severity] ?? 0}
                    max={maxSeverity}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix = "",
  loading,
  accent,
}: {
  label: string;
  value: number | undefined;
  suffix?: string;
  loading: boolean;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/40 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {loading ? (
        <div className="skeleton mt-2 h-9 w-20 rounded-lg" />
      ) : (
        <p className={`mt-1 text-3xl font-semibold tabular-nums ${accent}`}>
          {value ?? "—"}
          {value !== undefined ? suffix : ""}
        </p>
      )}
    </div>
  );
}

function SeverityBar({
  severity,
  value,
  max,
}: {
  severity: Severity;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-24 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ring-1 ring-inset ${severityClass[severity]}`}
      >
        {severity}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-slate-300">
        {value}
      </span>
    </div>
  );
}
