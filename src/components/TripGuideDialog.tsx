import { useEffect, useMemo, useState } from "react";
import { MousePointer2, RefreshCw, Route, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface TripGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WalkthroughStep {
  title: string;
  description: string;
  durationMs: number;
  cursor: { x: number; y: number };
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Type a city",
    description: "The city field updates to Mumbai.",
    durationMs: 1300,
    cursor: { x: 88, y: 92 },
  },
  {
    title: "Choose a vibe",
    description: "Set vibe to Culture Walk for smarter recommendations.",
    durationMs: 1300,
    cursor: { x: 88, y: 132 },
  },
  {
    title: "Set time window",
    description: "Use evening to tune discovery to when you are heading out.",
    durationMs: 1300,
    cursor: { x: 212, y: 132 },
  },
  {
    title: "Add a stop",
    description: "Tap + Trip on a place card to add it to your itinerary.",
    durationMs: 1500,
    cursor: { x: 233, y: 224 },
  },
  {
    title: "Open Trip Bucket",
    description: "Review, reorder, optimize route, then save and share.",
    durationMs: 1500,
    cursor: { x: 355, y: 66 },
  },
];

const CITY_FRAMES = ["B", "Mu", "Mumb", "Mumbai", "Mumbai"];

function getFrameIndex(step: number): number {
  return Math.min(CITY_FRAMES.length - 1, step);
}

export default function TripGuideDialog({ open, onOpenChange }: TripGuideDialogProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveStepIndex(0);
      setIsPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isPlaying) return;

    if (activeStepIndex >= WALKTHROUGH_STEPS.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveStepIndex((current) => Math.min(current + 1, WALKTHROUGH_STEPS.length - 1));
    }, WALKTHROUGH_STEPS[activeStepIndex].durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeStepIndex, isPlaying, open]);

  const currentStep = WALKTHROUGH_STEPS[activeStepIndex];
  const progressPercent = useMemo(
    () => Math.round(((activeStepIndex + 1) / WALKTHROUGH_STEPS.length) * 100),
    [activeStepIndex],
  );

  const cityValue = CITY_FRAMES[getFrameIndex(activeStepIndex)];
  const vibeValue = activeStepIndex >= 1 ? "Culture Walk" : "Night Out";
  const timeValue = activeStepIndex >= 2 ? "Evening" : "Morning";
  const tripCount = activeStepIndex >= 3 ? 1 : 0;
  const routeReady = activeStepIndex >= 4;

  const startWalkthrough = () => {
    setActiveStepIndex(0);
    setIsPlaying(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92dvh] overflow-hidden border-white/10 bg-black/80 text-white backdrop-blur-2xl sm:max-w-3xl">
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_90%_75%,rgba(56,189,248,0.14),transparent_35%),linear-gradient(165deg,rgba(2,6,23,0.95),rgba(15,23,42,0.86))] p-5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              Show Me How To Use Basho
            </DialogTitle>
            <DialogDescription className="sr-only">
              Interactive walkthrough that starts after pressing Show Me How To Use.
            </DialogDescription>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Start the walkthrough to see a guided demo with a highlighted cursor showing city setup,
              vibe selection, and adding places to Trip Bucket.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={startWalkthrough}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-400/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-400/30"
              >
                <Sparkles className="h-4 w-4" />
                Show Me How To Use
              </button>

              <button
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
              >
                Skip For Now
              </button>

              <button
                onClick={startWalkthrough}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
              >
                <RefreshCw className="h-3 w-3" />
                Replay
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-200/85">Walkthrough</p>
            <p className="mt-1 text-xs text-white/75" aria-live="polite">
              <span className="font-semibold text-white">{currentStep.title}</span>
              {" "}
              <span className="text-white/65">{currentStep.description}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="relative h-[310px] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.14),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(20,184,166,0.12),transparent_38%)]" />

            <div className="relative z-10 grid h-full grid-cols-[2fr_1fr] gap-3 p-3">
              <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">Discovery Context</p>

                <div className="mt-2 space-y-2 text-xs">
                  <div className={`rounded-md border px-2 py-1.5 ${activeStepIndex === 0 ? "border-cyan-300/50 bg-cyan-400/15" : "border-white/10 bg-white/5"}`}>
                    City: <span className="font-semibold text-white">{cityValue}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-md border px-2 py-1.5 ${activeStepIndex === 1 ? "border-cyan-300/50 bg-cyan-400/15" : "border-white/10 bg-white/5"}`}>
                      Vibe: <span className="font-semibold text-white">{vibeValue}</span>
                    </div>
                    <div className={`rounded-md border px-2 py-1.5 ${activeStepIndex === 2 ? "border-cyan-300/50 bg-cyan-400/15" : "border-white/10 bg-white/5"}`}>
                      Time: <span className="font-semibold text-white">{timeValue}</span>
                    </div>
                  </div>
                </div>

                <div className={`mt-3 rounded-md border p-2 ${activeStepIndex === 3 ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.03]"}`}>
                  <p className="text-xs font-semibold text-white">Paradox Museum Mumbai</p>
                  <p className="mt-1 text-[10px] text-white/65">Fort, Mumbai</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">#culture-walk</span>
                    <span className="rounded-md border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                      + Trip
                    </span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg border p-3 ${activeStepIndex === 4 ? "border-cyan-300/50 bg-cyan-500/10" : "border-white/10 bg-black/30"}`}>
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                  <Route className="h-3 w-3" />
                  Trip Bucket
                </p>
                <p className="mt-2 text-xs text-white/75">Stops: <span className="font-semibold text-white">{tripCount}</span></p>
                <p className="mt-1 text-xs text-white/65">
                  {routeReady ? "Route optimized. Ready to save and share." : "Add places to build your plan."}
                </p>
                <div className="mt-3 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-white/75">
                  Save Plan to Share Link
                </div>
              </div>
            </div>

            {isPlaying && (
              <motion.div
                className="pointer-events-none absolute z-20"
                initial={false}
                animate={{ x: currentStep.cursor.x, y: currentStep.cursor.y, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
              >
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full border border-cyan-300/45 animate-ping" />
                  <MousePointer2 className="h-7 w-7 text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
