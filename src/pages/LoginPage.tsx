import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { describeError } from "../utils/errors";
import { Spinner } from "../components/Spinner";

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [teamCode, setTeamCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in -> go straight to the dashboard.
  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  const redirectTo =
    (location.state as LocationState | null)?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ teamCode: teamCode.trim(), email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-ink-950 shadow-lg shadow-brand-500/30">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="currentColor">
              <circle cx="11" cy="13" r="3" />
              <circle cx="21" cy="13" r="3" />
              <path
                d="M9 21c2 2.5 12 2.5 14 0"
                stroke="currentColor"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            TropelCare Control Room
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inicia sesión con las credenciales de tu equipo
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-6 shadow-xl"
        >
          <Field
            label="Código de equipo"
            id="teamCode"
            value={teamCode}
            onChange={setTeamCode}
            placeholder="TEAM-001"
            autoComplete="username"
            autoFocus
          />
          <Field
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="operator@tuckersoft.com"
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !teamCode || !email || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner className="h-4 w-4 text-ink-950" />}
            {submitting ? "Ingresando…" : "Encender la consola"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-slate-400"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  );
}
