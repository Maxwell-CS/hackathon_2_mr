import { useCallback, useEffect, useState } from "react";
import { getSignal, updateSignalStatus } from "../api/endpoints";
import { ApiError } from "../api/client";
import {
  UPDATABLE_STATUSES,
  type Signal,
  type UpdatableStatus,
} from "../api/types";
import { describeError } from "../utils/errors";
import { Spinner } from "./Spinner";
import { ErrorState } from "./States";
import { Badge } from "./Badge";
import { severityClass, statusClass, signalTypeLabel } from "../ui/theme";

/**
 * Detail body shown inside the modal. Loads the full signal, allows promoting
 * its status to PROCESANDO / ATENDIDA, and notifies the parent so the feed can
 * reflect the change. `seed` lets us paint instantly from the feed item while
 * the fresh detail loads.
 */
export function SignalDetail({
  signalId,
  seed,
  onUpdated,
}: {
  signalId: string;
  seed?: Signal;
  onUpdated: (signal: Signal) => void;
}) {
  const [signal, setSignal] = useState<Signal | null>(seed ?? null);
  const [loading, setLoading] = useState(!seed);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pending, setPending] = useState<UpdatableStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(
    (signalCtl?: AbortSignal) => {
      setLoading(true);
      setLoadError(null);
      return getSignal(signalId, signalCtl)
        .then((fresh) => {
          setSignal(fresh);
          setLoading(false);
        })
        .catch((err) => {
          if (ApiError.isAbort(err)) return;
          setLoadError(describeError(err));
          setLoading(false);
        });
    },
    [signalId],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleUpdate = async (status: UpdatableStatus) => {
    setPending(status);
    setActionError(null);
    setSuccess(null);
    try {
      const updated = await updateSignalStatus(signalId, status);
      setSignal(updated);
      onUpdated(updated); // reflect in the feed
      setSuccess(`Señal actualizada a ${updated.status}.`);
    } catch (err) {
      // Keep the previous status; show an actionable error.
      setActionError(describeError(err));
    } finally {
      setPending(null);
    }
  };

  if (loading && !signal) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (loadError && !signal) {
    return <ErrorState message={loadError} onRetry={() => load()} />;
  }

  if (!signal) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusClass[signal.status]}>{signal.status}</Badge>
        <Badge className={severityClass[signal.severity]}>
          {signal.severity}
        </Badge>
        <span className="text-sm text-slate-400">
          {signalTypeLabel[signal.signalType]}
        </span>
      </div>

      <div className="rounded-xl border border-ink-700 bg-ink-950/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Contenido
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">
          {signal.rawContent}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Tropel" value={signal.tropel.name} />
        <Field label="Especie" value={signal.tropel.species} />
        <Field
          label="Creada"
          value={new Date(signal.createdAt).toLocaleString("es")}
        />
        <Field
          label="Actualizada"
          value={new Date(signal.updatedAt).toLocaleString("es")}
        />
      </dl>

      {/* Status actions ------------------------------------------------- */}
      <div className="space-y-3 border-t border-ink-700 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Actualizar estado
        </p>
        <div className="flex flex-wrap gap-2">
          {UPDATABLE_STATUSES.map((status) => {
            const isCurrent = signal.status === status;
            const isBusy = pending === status;
            return (
              <button
                key={status}
                type="button"
                disabled={pending !== null || isCurrent}
                onClick={() => handleUpdate(status)}
                className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-brand-500/50 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy && <Spinner className="h-4 w-4" />}
                {isCurrent ? `Ya ${status}` : `Marcar ${status}`}
              </button>
            );
          })}
        </div>

        {success && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            {success}
          </p>
        )}

        {actionError && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-auto rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-rose-500/40 hover:bg-rose-500/20"
            >
              Descartar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-950/40 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-200">{value}</dd>
    </div>
  );
}
