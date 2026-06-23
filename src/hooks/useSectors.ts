import { useEffect, useState } from "react";
import { getSectors } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { SectorListItem } from "../api/types";

/** Loads the lightweight sector list once (used by filters and navigation). */
export function useSectors() {
  const [sectors, setSectors] = useState<SectorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    getSectors(controller.signal)
      .then((res) => {
        setSectors(res.items);
        setLoading(false);
      })
      .catch((err) => {
        if (ApiError.isAbort(err)) return;
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { sectors, loading, error };
}
