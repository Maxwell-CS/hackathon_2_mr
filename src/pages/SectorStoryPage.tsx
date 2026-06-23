import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSectorStory } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { SectorStory, StoryStage } from "../api/types";
import { describeError } from "../utils/errors";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useScrollDrivenSupport } from "../hooks/useScrollDrivenSupport";
import { withViewTransition } from "../utils/viewTransition";
import { Spinner } from "../components/Spinner";
import { ErrorState } from "../components/States";
import {
  accentForToken,
  climateGradient,
  climateLabel,
  signalTypeLabel,
} from "../ui/theme";

type Mode = "summary" | "story";

export function SectorStoryPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [story, setStory] = useState<SectorStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      return getSectorStory(id, signal)
        .then((res) => {
          // Defensive: always present stages in canonical order.
          res.stages.sort((a, b) => a.order - b.order);
          setStory(res);
          setLoading(false);
        })
        .catch((err) => {
          if (ApiError.isAbort(err)) return;
          setError(describeError(err));
          setLoading(false);
        });
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="mx-auto max-w-md py-10">
        <ErrorState
          message={error ?? "No se encontró la historia."}
          onRetry={() => load()}
        />
        <div className="mt-4 text-center">
          <Link to="/sectors" className="text-sm text-brand-400 hover:underline">
            ← Volver a sectores
          </Link>
        </div>
      </div>
    );
  }

  return <StoryExperience story={story} />;
}

// ===========================================================================

function StoryExperience({ story }: { story: SectorStory }) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const scrollDriven = useScrollDrivenSupport();

  const [mode, setMode] = useState<Mode>("summary");
  const [activeIndex, setActiveIndex] = useState(0);

  const stages = story.stages;
  const activeStage = stages[activeIndex] ?? stages[0];
  const accent = accentForToken(activeStage.colorToken);

  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // --- Active-stage tracking via IntersectionObserver --------------------
  // Works for both CSS-supported and fallback browsers; it also feeds the
  // persistent HUD (metrics that must match the active stage).
  useEffect(() => {
    if (mode !== "story") return;
    const nodes = stageRefs.current.filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the most-visible intersecting stage as active.
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(
            (entry.target as HTMLElement).dataset.index ?? "0",
          );
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveIndex(best.index);
      },
      {
        // Center band: a stage becomes active as it crosses the viewport middle.
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [mode, stages.length]);

  // --- Scroll-progress for the JS fallback bar ---------------------------
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    if (mode !== "story" || scrollDriven) return; // CSS handles it when supported
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, scrollDriven]);

  // --- Navigation helpers ------------------------------------------------
  const scrollToStage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(stages.length - 1, index));
      setActiveIndex(clamped);
      stageRefs.current[clamped]?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
    },
    [stages.length, reducedMotion],
  );

  // Keyboard navigation across stages (arrows / Home / End / PageUp-Down).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          scrollToStage(activeIndex + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          scrollToStage(activeIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          scrollToStage(0);
          break;
        case "End":
          e.preventDefault();
          scrollToStage(stages.length - 1);
          break;
        default:
          break;
      }
    },
    [activeIndex, scrollToStage, stages.length],
  );

  // flushSync forces the DOM to commit synchronously inside the transition
  // callback, so the View Transition snapshots the new view correctly (enabling
  // the shared-element morph). Without VT support, withViewTransition just runs
  // the update and the CSS .vt-fade provides the fallback.
  const enterStory = () =>
    withViewTransition(() => flushSync(() => setMode("story")));
  const backToSummary = () => {
    withViewTransition(() => flushSync(() => setMode("summary")));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const progressPct = scrollDriven
    ? null
    : Math.round(
        (reducedMotion
          ? activeIndex / Math.max(1, stages.length - 1)
          : scrollProgress) * 100,
      );

  // ---------------------------------------------------------------------
  // SUMMARY VIEW
  // ---------------------------------------------------------------------
  if (mode === "summary") {
    return (
      <SummaryView
        story={story}
        accent={accentForToken(stages[0].colorToken)}
        onEnter={enterStory}
      />
    );
  }

  // ---------------------------------------------------------------------
  // STORY (scrollytelling) VIEW
  // ---------------------------------------------------------------------
  return (
    <div
      ref={scrollerRef}
      className="vt-fade"
      role="region"
      aria-label={`Historia del sector ${story.sector.name}`}
      style={{ viewTransitionName: `sector-${story.sector.id}` }}
    >
      {/* Persistent background — changes color smoothly with the active stage */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br ${climateGradient[story.sector.climate]}`}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-[box-shadow] duration-700 ease-out"
        style={{ boxShadow: `inset 0 0 40vmax 8vmax ${accent}22` }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed left-[8%] top-[18%] -z-10 h-64 w-64 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: `${accent}33` }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[12%] right-[10%] -z-10 h-72 w-72 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: `${accent}22` }}
      />

      {/* Progress bar (top). CSS scroll-driven when supported, JS otherwise. */}
      <div className="fixed inset-x-0 top-0 z-30 h-1.5 bg-black/40">
        {scrollDriven ? (
          <div
            className="story-progress-bar h-full w-full origin-left"
            style={{ backgroundColor: accent }}
          />
        ) : (
          <div
            className="h-full origin-left transition-[width] duration-200"
            style={{ width: `${progressPct ?? 0}%`, backgroundColor: accent }}
          />
        )}
      </div>

      {/* Persistent HUD — metrics always match the active stage ----------- */}
      <aside className="fixed left-3 top-6 z-20 hidden w-60 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md lg:block">
        <button
          onClick={backToSummary}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white"
        >
          ← Resumen
        </button>
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          {climateLabel[story.sector.climate]}
        </p>
        <h2 className="text-lg font-semibold text-white">
          {story.sector.name}
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Etapa {activeIndex + 1} / {stages.length}
        </p>

        <div className="mt-4 space-y-3">
          <HudMetric
            label="Estabilidad"
            value={activeStage.metrics.stability}
            accent={accent}
          />
          <HudMetric
            label="Energía"
            value={activeStage.metrics.energy}
            accent={accent}
          />
          <HudMetric
            label="Alertas"
            value={activeStage.metrics.alerts}
            accent={accent}
            raw
          />
        </div>

        <div
          className="mt-4 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-500"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          Evento dominante: {signalTypeLabel[activeStage.dominantEvent]}
        </div>

        {/* Stage dots for quick keyboard/click jump */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {stages.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Ir a etapa ${i + 1}`}
              aria-current={i === activeIndex}
              onClick={() => scrollToStage(i)}
              className="h-2.5 w-2.5 rounded-full transition"
              style={{
                backgroundColor:
                  i === activeIndex ? accent : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </aside>

      {/* Mobile top bar (equivalent behavior, compact) -------------------- */}
      <div className="fixed inset-x-0 top-1.5 z-20 flex items-center justify-between gap-2 px-3 py-2 lg:hidden">
        <button
          onClick={backToSummary}
          className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
        >
          ← Resumen
        </button>
        <span className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          {activeIndex + 1}/{stages.length} ·{" "}
          {signalTypeLabel[activeStage.dominantEvent]}
        </span>
      </div>

      {/* Scrollable stages. Each panel keeps its full content in the DOM,    */}
      {/* so keyboard users and reduced-motion users never lose anything.     */}
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="outline-none"
        aria-roledescription="carrusel de historia"
      >
        {stages.map((stage, index) => (
          <StagePanel
            key={stage.id}
            stage={stage}
            index={index}
            active={index === activeIndex}
            registerRef={(el) => (stageRefs.current[index] = el)}
          />
        ))}
      </div>

      {/* Footer / end of story */}
      <footer className="relative z-10 flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-white/70">Fin del recorrido</p>
        <div className="flex gap-3">
          <button
            onClick={() => scrollToStage(0)}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Reiniciar
          </button>
          <button
            onClick={() => navigate("/sectors")}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Otros sectores
          </button>
        </div>
      </footer>
    </div>
  );
}

// ===========================================================================

function SummaryView({
  story,
  accent,
  onEnter,
}: {
  story: SectorStory;
  accent: string;
  onEnter: () => void;
}) {
  return (
    <div
      className={`vt-fade relative -mx-4 -my-6 min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-gradient-to-br ${climateGradient[story.sector.climate]} px-4 py-10`}
      style={{ viewTransitionName: `sector-${story.sector.id}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-10%] h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: `${accent}33` }}
      />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
        <Link
          to="/sectors"
          className="self-start text-sm text-white/70 hover:text-white"
        >
          ← Sectores
        </Link>
        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
          {climateLabel[story.sector.climate]}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {story.sector.name}
        </h1>
        <p className="max-w-md text-white/70">
          Una historia de {story.stages.length} etapas. Cada etapa transforma el
          entorno, las métricas y el evento dominante a medida que avanzas.
        </p>

        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          {story.stages[0] && (
            <>
              <SummaryStat
                label="Estabilidad"
                value={`${story.stages[0].metrics.stability}%`}
                accent={accent}
              />
              <SummaryStat
                label="Energía"
                value={`${story.stages[0].metrics.energy}%`}
                accent={accent}
              />
              <SummaryStat
                label="Etapas"
                value={String(story.stages.length)}
                accent={accent}
              />
            </>
          )}
        </div>

        <button
          onClick={onEnter}
          className="mt-2 rounded-xl px-6 py-3 text-base font-semibold text-ink-950 shadow-lg transition hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          Comenzar recorrido ↓
        </button>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

// ===========================================================================

function StagePanel({
  stage,
  index,
  active,
  registerRef,
}: {
  stage: StoryStage;
  index: number;
  active: boolean;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const accent = accentForToken(stage.colorToken);
  return (
    <section
      ref={registerRef}
      data-index={index}
      tabIndex={0}
      aria-label={`Etapa ${index + 1}: ${stage.title}`}
      className="relative flex min-h-[100dvh] items-center justify-center px-4 py-20"
    >
      <article
        className={`story-panel w-full max-w-xl rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-md sm:p-8 ${
          active ? "is-active" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-ink-950"
            style={{ backgroundColor: accent }}
          >
            {index + 1}
          </span>
          <span
            className="rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: `${accent}66`, color: accent }}
          >
            {signalTypeLabel[stage.dominantEvent]}
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
          {stage.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/80">
          {stage.narrative}
        </p>

        {/* Per-stage metrics inline so content is never hidden behind the HUD */}
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <StageMetric label="Estabilidad" value={`${stage.metrics.stability}%`} accent={accent} />
          <StageMetric label="Energía" value={`${stage.metrics.energy}%`} accent={accent} />
          <StageMetric label="Alertas" value={String(stage.metrics.alerts)} accent={accent} />
        </dl>
      </article>
    </section>
  );
}

function StageMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="text-lg font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function HudMetric({
  label,
  value,
  accent,
  raw = false,
}: {
  label: string;
  value: number;
  accent: string;
  raw?: boolean;
}) {
  const width = raw ? Math.min(100, value * 8) : Math.min(100, value);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-white">
          {value}
          {raw ? "" : "%"}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-500"
          style={{ width: `${width}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}
