import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="text-xl font-semibold text-slate-100">
        Ruta no encontrada
      </h1>
      <p className="text-sm text-slate-500">
        La página que buscas no existe en la consola.
      </p>
      <Link
        to="/dashboard"
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-400"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
