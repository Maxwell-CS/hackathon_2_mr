import { useCallback, useEffect, useRef, useState } from "react";
import { getSignalsFeed, type SignalFeedQuery } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { Signal } from "../api/types";
import { describeError } from "../utils/errors";

export interface SignalFilters {
  signalType: string;
  severity: string;
  status: string;
  q: string;
}

const LIMIT = 15;

interface FeedState {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
  /** Initial (first page) loading. */
  loading: boolean;
  /** Subsequent page loading. */
  loadingMore: boolean;
  /** Error message for whichever load failed; previous pages are retained. */
  error: string | null;
}

const INITIAL: FeedState = {
  items: [],
  nextCursor: null,
  hasMore: true,
  totalEstimate: 0,
  loading: true,
  loadingMore: false,
  error: null,
};

function filtersToQuery(f: SignalFilters): Omit<SignalFeedQuery, "cursor"> {
  return {
    limit: LIMIT,
    signalType: f.signalType || undefined,
    severity: f.severity || undefined,
    status: f.status || undefined,
    q: f.q || undefined,
  };
}

/**
 * Cursor-based infinite feed. Guarantees:
 *  - exactly one in-flight request at a time;
 *  - dedup by signal id across pages;
 *  - aborting / discarding stale requests when filters change;
 *  - error recovery that keeps already-loaded pages;
 *  - graceful end-of-list (hasMore === false).
 */
export function useInfiniteSignals(filters: SignalFilters) {
  const [state, setState] = useState<FeedState>(INITIAL);

  // Monotonic token: every request captures the token active when it started;
  // responses whose token is stale are discarded.
  const tokenRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);
  const idsRef = useRef<Set<string>>(new Set());
  // Latest cursor/hasMore kept in a ref so loadMore reads fresh values without
  // being re-created on every state change.
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef<boolean>(true);

  const filtersKey = `${filters.signalType}|${filters.severity}|${filters.status}|${filters.q}`;

  const runFetch = useCallback(
    (cursor: string | null, isInitial: boolean) => {
      // Cancel any previous in-flight request.
      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;
      const token = tokenRef.current;

      setState((s) => ({
        ...s,
        loading: isInitial ? true : s.loading,
        loadingMore: isInitial ? false : true,
        error: null,
      }));

      getSignalsFeed(
        { ...filtersToQuery(filters), cursor: cursor ?? undefined },
        controller.signal,
      )
        .then((res) => {
          if (token !== tokenRef.current) return; // stale -> discard
          cursorRef.current = res.nextCursor;
          hasMoreRef.current = res.hasMore;

          setState((s) => {
            const seen = idsRef.current;
            const merged = isInitial ? [] : s.items.slice();
            if (isInitial) seen.clear();
            for (const item of res.items) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
              }
            }
            return {
              items: merged,
              nextCursor: res.nextCursor,
              hasMore: res.hasMore,
              totalEstimate: res.totalEstimate,
              loading: false,
              loadingMore: false,
              error: null,
            };
          });
        })
        .catch((err) => {
          if (ApiError.isAbort(err) || token !== tokenRef.current) return;
          // Keep previously loaded items; just surface the error.
          setState((s) => ({
            ...s,
            loading: false,
            loadingMore: false,
            error: describeError(err),
          }));
        });
    },
    [filters],
  );

  // Reset and reload whenever the filter set changes.
  useEffect(() => {
    tokenRef.current += 1;
    idsRef.current = new Set();
    cursorRef.current = null;
    hasMoreRef.current = true;
    setState({ ...INITIAL });
    runFetch(null, true);
    return () => {
      inFlightRef.current?.abort();
    };
    // filtersKey captures every meaningful filter value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  /** Load the next page if possible. Safe to call repeatedly (idempotent).
   *  The state guard ensures only one in-flight request and stops at end-of-list
   *  or while an error is showing (recovery goes through `retry`). */
  const loadMore = useCallback(() => {
    setState((s) => {
      if (s.loading || s.loadingMore || s.error || !hasMoreRef.current) return s;
      runFetch(cursorRef.current, false);
      return s;
    });
  }, [runFetch]);

  /** Retry after an error without discarding loaded pages. */
  const retry = useCallback(() => {
    setState((s) => {
      const isInitial = s.items.length === 0;
      runFetch(isInitial ? null : cursorRef.current, isInitial);
      return s;
    });
  }, [runFetch]);

  /** Replace a single signal in place (used after a status PATCH). */
  const applySignalUpdate = useCallback((updated: Signal) => {
    setState((s) => {
      if (!idsRef.current.has(updated.id)) return s;
      return {
        ...s,
        items: s.items.map((it) => (it.id === updated.id ? updated : it)),
      };
    });
  }, []);

  return {
    ...state,
    loadMore,
    retry,
    applySignalUpdate,
  };
}
