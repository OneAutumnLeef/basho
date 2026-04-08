import { useEffect, useMemo, useState } from "react";
import { Compass, RefreshCw, Route, Save, Share2, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TripGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    title: "Pick Your Vibe",
    description: "Set city, vibe, and time window in the left panel to focus discovery.",
    icon: Sparkles,
    tone: "from-cyan-500/20 to-sky-500/10 border-cyan-300/25",
  },
  {
    title: "Build Your Route",
    description: "Add places into Trip Bucket, adjust stop minutes, then optimize your route.",
    icon: Route,
    tone: "from-emerald-500/20 to-teal-500/10 border-emerald-300/25",
  },
  {
    title: "Save And Share",
    description: "Save your plan, copy the link from Share, and collaborators can import it instantly.",
    icon: Share2,
    tone: "from-fuchsia-500/20 to-rose-500/10 border-fuchsia-300/25",
  },
];

const QUICK_START_DURATION_MS = 20_000;
const TICK_MS = 120;

export default function TripGuideDialog({ open, onOpenChange }: TripGuideDialogProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [replayVersion, setReplayVersion] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      return;
    }

    const startedAt = Date.now();
    setElapsedMs(0);

    const timer = window.setInterval(() => {
      const elapsed = Math.min(QUICK_START_DURATION_MS, Date.now() - startedAt);
      setElapsedMs(elapsed);

      if (elapsed >= QUICK_START_DURATION_MS) {
        window.clearInterval(timer);
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [open, replayVersion]);

  const progressRatio = useMemo(
    () => Math.min(1, elapsedMs / QUICK_START_DURATION_MS),
    [elapsedMs],
  );

  const activeStepIndex = useMemo(
    () =>
      Math.min(
        STEPS.length - 1,
        Math.floor(progressRatio * STEPS.length),
      ),
    [progressRatio],
  );

  const secondsRemaining = Math.max(
    0,
    Math.ceil((QUICK_START_DURATION_MS - elapsedMs) / 1000),
  );

  const currentStep = STEPS[activeStepIndex];

  function handleReplay() {
    setReplayVersion((current) => current + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92dvh] sm:max-w-2xl overflow-hidden border-white/10 bg-black/70 text-white backdrop-blur-2xl">
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(217,70,239,0.16),transparent_35%),linear-gradient(165deg,rgba(2,6,23,0.92),rgba(15,23,42,0.8))] p-5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">How Basho Works</DialogTitle>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Basho is a map-first planner: discover places, build an itinerary, and share a plan that others can open directly.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-200/85">
                20s Quick Start
              </p>
              <button
                onClick={handleReplay}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
              >
                <RefreshCw className="h-3 w-3" />
                Replay
              </button>
            </div>

            <p className="mt-2 text-xs text-white/75" aria-live="polite">
              Now: <span className="font-semibold text-white">{currentStep.title}</span>
              {progressRatio < 1 ? `  |  ${secondsRemaining}s left` : "  |  Complete"}
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.round(progressRatio * 100)}%` }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStepIndex;
              const isComplete = index < activeStepIndex || progressRatio >= 1;

              return (
                <motion.div
                  key={step.title}
                  animate={
                    isActive
                      ? {
                          scale: 1.03,
                          y: -2,
                          boxShadow:
                            "0 0 0 1px rgba(125,211,252,0.45), 0 10px 28px rgba(56,189,248,0.2)",
                        }
                      : {
                          scale: 1,
                          y: 0,
                          boxShadow: "0 0 0 0 rgba(0,0,0,0)",
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`rounded-xl border bg-gradient-to-br p-3 transition-opacity ${step.tone} ${
                    isActive ? "opacity-100" : "opacity-85"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white ring-1 ring-white/15">
                      <Icon className="h-4 w-4" />
                    </div>
                    {isActive ? (
                      <span className="rounded-md border border-cyan-300/35 bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                        Now
                      </span>
                    ) : isComplete ? (
                      <span className="rounded-md border border-emerald-300/35 bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                        Done
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">{step.description}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Compass className="h-4 w-4 text-cyan-300" />
                Quick Flow
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Discover in sidebar, then add to Trip Bucket, optimize route, save, and share the link.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="h-4 w-4 text-emerald-300" />
                Collaboration Tips
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Sign in before saving if you want cloud persistence and collaboration-ready plans.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-xs leading-relaxed text-white/70">
            <p className="inline-flex items-center gap-2 font-semibold text-white">
              <Save className="h-4 w-4 text-primary" />
              Notes
            </p>
            <p className="mt-1">
              Use Place Details to add short notes to saved places. Notes and tags are attached to your saved-place record.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
