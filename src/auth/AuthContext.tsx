import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import { login as loginRequest, me } from "../api/endpoints";
import type { LoginRequest, User } from "../api/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = "tropelcare.user";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Any 401 from anywhere in the app forces a clean logout.
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Session restoration on reload: trust the cached user optimistically, then
  // validate the token against /auth/me.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const cached = readStoredUser();
    if (cached) setUser(cached);

    const controller = new AbortController();
    me(controller.signal)
      .then((fresh) => {
        setUser(fresh);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fresh));
        } catch {
          /* ignore */
        }
        setStatus("authenticated");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Invalid/expired token -> force unauthenticated.
        logout();
      });

    return () => controller.abort();
  }, [logout]);

  const login = useCallback(async (payload: LoginRequest) => {
    const res = await loginRequest(payload);
    tokenStore.set(res.token);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch {
      /* ignore */
    }
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
