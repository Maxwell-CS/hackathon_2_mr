// ---------------------------------------------------------------------------
// Strict DTO interfaces mirroring the TropelCare Control API contract.
// No `any` is used for API responses anywhere in the app.
// ---------------------------------------------------------------------------

export const SPECIES = [
  "BLOBITO",
  "CHISPA",
  "GRUNON",
  "DORMILON",
  "GLITCHY",
] as const;
export type Species = (typeof SPECIES)[number];

export const VITAL_STATES = [
  "ESTABLE",
  "HAMBRIENTO",
  "AGITADO",
  "MUTANDO",
  "CRITICO",
] as const;
export type VitalState = (typeof VITAL_STATES)[number];

export const SIGNAL_TYPES = [
  "HAMBRE",
  "ABANDONO",
  "MUTACION",
  "FUGA",
  "CONFLICTO",
  "REPRODUCCION_MASIVA",
  "SENAL_CORRUPTA",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SEVERITIES = ["LEVE", "MODERADO", "GRAVE", "CRITICO"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SIGNAL_STATUSES = ["RECIBIDA", "PROCESANDO", "ATENDIDA"] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

/** Only these statuses can be written via PATCH /signals/:id/status. */
export const UPDATABLE_STATUSES = ["PROCESANDO", "ATENDIDA"] as const;
export type UpdatableStatus = (typeof UPDATABLE_STATUSES)[number];

export const CLIMATES = [
  "PIXEL_FOREST",
  "NEON_CAVE",
  "CLOUD_AQUARIUM",
  "RETRO_ARCADE",
] as const;
export type Climate = (typeof CLIMATES)[number];

// --- Auth -------------------------------------------------------------------

export type UserRole = "OPERATOR" | string;

export interface User {
  id: string;
  displayName: string;
  email: string;
  teamCode: string;
  role: UserRole;
}

export interface LoginRequest {
  teamCode: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

// --- Dashboard --------------------------------------------------------------

export interface SignalsBySeverity {
  LEVE: number;
  MODERADO: number;
  GRAVE: number;
  CRITICO: number;
}

export interface DashboardSummary {
  totalTropels: number;
  criticalTropels: number;
  openSignals: number;
  sectorStabilityAvg: number;
  signalsBySeverity: SignalsBySeverity;
  generatedAt: string;
}

// --- Tropels ----------------------------------------------------------------

export interface TropelSectorRef {
  id: string;
  name: string;
  sectorCode: string;
}

export interface Tropel {
  id: string;
  name: string;
  species: Species;
  vitalState: VitalState;
  energyLevel: number;
  chaosIndex: number;
  mutationStage: number;
  guardianName: string;
  sector: TropelSectorRef;
  createdAt: string;
  updatedAt: string;
}

export interface PagedTropels {
  content: Tropel[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

// --- Signals ----------------------------------------------------------------

export interface SignalTropelRef {
  id: string;
  name: string;
  species: Species;
}

export interface Signal {
  id: string;
  signalType: SignalType;
  severity: Severity;
  status: SignalStatus;
  rawContent: string;
  tropel: SignalTropelRef;
  createdAt: string;
  updatedAt: string;
}

export interface SignalsFeed {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}

// --- Sectors & Story --------------------------------------------------------

export interface SectorListItem {
  id: string;
  sectorCode: string;
  name: string;
  climate: Climate;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export interface SectorsList {
  items: SectorListItem[];
}

export interface StoryMetrics {
  stability: number;
  energy: number;
  alerts: number;
}

export interface StoryStage {
  id: string;
  order: number;
  title: string;
  narrative: string;
  dominantEvent: SignalType;
  metrics: StoryMetrics;
  assetKey: string;
  colorToken: string;
  progress: number;
}

export interface SectorStoryRef {
  id: string;
  name: string;
  climate: Climate;
}

export interface SectorStory {
  sector: SectorStoryRef;
  stages: StoryStage[];
}

// --- Errors -----------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}
