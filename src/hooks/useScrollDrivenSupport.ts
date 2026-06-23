import { useEffect, useState } from "react";

/** True when the browser supports CSS scroll-driven animations
 *  (`animation-timeline: scroll()`). Drives the CSS-vs-JS fallback split. */
export function useScrollDrivenSupport(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    try {
      setSupported(
        typeof CSS !== "undefined" &&
          CSS.supports("animation-timeline: scroll()"),
      );
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}
