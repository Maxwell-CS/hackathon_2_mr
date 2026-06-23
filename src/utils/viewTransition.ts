/**
 * Runs `update` inside the View Transition API when available, otherwise just
 * runs it directly (the CSS fallback handles the simple fade). Respects
 * prefers-reduced-motion by skipping the animated transition.
 */
export function withViewTransition(update: () => void): void {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (typeof document !== "undefined" && document.startViewTransition && !prefersReduced) {
    document.startViewTransition(update);
  } else {
    update();
  }
}
