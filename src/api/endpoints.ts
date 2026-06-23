import { apiRequest } from "./client";
import type {
  DashboardSummary,
  LoginRequest,
  LoginResponse,
  PagedTropels,
  SectorStory,
  SectorsList,
  Signal,
  SignalsFeed,
  Tropel,
  UpdatableStatus,
  User,
} from "./types";

// --- Auth -------------------------------------------------------------------

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function me(signal?: AbortSignal): Promise<User> {
  return apiRequest<User>("/auth/me", { signal });
}

// --- Dashboard --------------------------------------------------------------

export function getDashboardSummary(
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary", { signal });
}

// --- Tropels ----------------------------------------------------------------

// Type aliases (not interfaces) so they carry an implicit index signature and
// are assignable to the client's generic `query` record.
export type TropelQuery = {
  page: number;
  size: number;
  species?: string;
  vitalState?: string;
  sectorId?: string;
  q?: string;
  sort: string;
};

export function getTropels(
  query: TropelQuery,
  signal?: AbortSignal,
): Promise<PagedTropels> {
  return apiRequest<PagedTropels>("/tropels", { query, signal });
}

export function getTropel(id: string, signal?: AbortSignal): Promise<Tropel> {
  return apiRequest<Tropel>(`/tropels/${encodeURIComponent(id)}`, { signal });
}

// --- Signals ----------------------------------------------------------------

export type SignalFeedQuery = {
  cursor?: string;
  limit: number;
  signalType?: string;
  severity?: string;
  status?: string;
  q?: string;
};

export function getSignalsFeed(
  query: SignalFeedQuery,
  signal?: AbortSignal,
): Promise<SignalsFeed> {
  return apiRequest<SignalsFeed>("/signals/feed", { query, signal });
}

export function getSignal(id: string, signal?: AbortSignal): Promise<Signal> {
  return apiRequest<Signal>(`/signals/${encodeURIComponent(id)}`, { signal });
}

export function updateSignalStatus(
  id: string,
  status: UpdatableStatus,
  signal?: AbortSignal,
): Promise<Signal> {
  return apiRequest<Signal>(`/signals/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
    signal,
  });
}

// --- Sectors & Story --------------------------------------------------------

export function getSectors(signal?: AbortSignal): Promise<SectorsList> {
  return apiRequest<SectorsList>("/sectors", { signal });
}

export function getSectorStory(
  id: string,
  signal?: AbortSignal,
): Promise<SectorStory> {
  return apiRequest<SectorStory>(
    `/sectors/${encodeURIComponent(id)}/story`,
    { signal },
  );
}
