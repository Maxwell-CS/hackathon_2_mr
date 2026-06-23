import type {
  Climate,
  Severity,
  SignalStatus,
  SignalType,
  VitalState,
} from "../api/types";

// Tailwind class strings kept explicit (full literals) so the JIT picks them up.

export const severityClass: Record<Severity, string> = {
  LEVE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  MODERADO: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  GRAVE: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  CRITICO: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export const statusClass: Record<SignalStatus, string> = {
  RECIBIDA: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  PROCESANDO: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  ATENDIDA: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

export const vitalStateClass: Record<VitalState, string> = {
  ESTABLE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  HAMBRIENTO: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  AGITADO: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  MUTANDO: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  CRITICO: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export const signalTypeLabel: Record<SignalType, string> = {
  HAMBRE: "Hambre",
  ABANDONO: "Abandono",
  MUTACION: "Mutación",
  FUGA: "Fuga",
  CONFLICTO: "Conflicto",
  REPRODUCCION_MASIVA: "Reproducción masiva",
  SENAL_CORRUPTA: "Señal corrupta",
};

export const climateLabel: Record<Climate, string> = {
  PIXEL_FOREST: "Pixel Forest",
  NEON_CAVE: "Neon Cave",
  CLOUD_AQUARIUM: "Cloud Aquarium",
  RETRO_ARCADE: "Retro Arcade",
};

// Gradient backdrops for the scrollytelling, keyed by climate and refined by
// the per-stage colorToken. These are deterministic CSS, not generated assets.
export const climateGradient: Record<Climate, string> = {
  PIXEL_FOREST: "from-emerald-950 via-emerald-900 to-teal-950",
  NEON_CAVE: "from-violet-950 via-fuchsia-950 to-indigo-950",
  CLOUD_AQUARIUM: "from-sky-950 via-cyan-950 to-blue-950",
  RETRO_ARCADE: "from-rose-950 via-orange-950 to-amber-950",
};

// colorToken -> accent color used for metrics, glow and dominant-event chip.
const colorTokenMap: Record<string, string> = {
  emerald: "#34d399",
  teal: "#2dd4bf",
  cyan: "#22d3ee",
  sky: "#38bdf8",
  blue: "#60a5fa",
  indigo: "#818cf8",
  violet: "#a78bfa",
  fuchsia: "#e879f9",
  rose: "#fb7185",
  orange: "#fb923c",
  amber: "#fbbf24",
  lime: "#a3e635",
};

export function accentForToken(token: string): string {
  return colorTokenMap[token.toLowerCase()] ?? "#38bdf8";
}
