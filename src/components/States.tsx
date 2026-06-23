import type { ReactNode } from "react";

/** Error panel with an optional retry action. Fixed min-height to avoid CLS. */
export function ErrorState({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center ${className}`}
    >
      <div className="text-rose-300">
        <svg
          className="mx-auto mb-2 h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"
          />
        </svg>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-rose-500/20 px-4 py-1.5 text-sm font-medium text-rose-200 ring-1 ring-inset ring-rose-500/40 transition hover:bg-rose-500/30"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Empty result panel. Fixed min-height to avoid layout shift. */
export function EmptyState({
  title,
  hint,
  icon,
  className = "",
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-ink-700 bg-ink-900/40 p-6 text-center ${className}`}
    >
      <div className="text-slate-500">{icon}</div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
