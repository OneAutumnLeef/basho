import { useMemo, useState } from "react";
import { ClipboardCopy, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShareableTripPayload } from "@/types/trips";

interface TripShareDialogProps {
  open: boolean;
  payload: ShareableTripPayload | null;
  shareUrl: string;
  onOpenChange: (open: boolean) => void;
  onImport?: () => void;
}

export default function TripShareDialog({
  open,
  payload,
  shareUrl,
  onOpenChange,
  onImport,
}: TripShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const previewPoints = useMemo(() => {
    if (!payload || payload.stops.length === 0) {
      return [] as Array<{ x: number; y: number; label: number }>;
    }

    const lats = payload.stops.map((stop) => stop.lat);
    const lngs = payload.stops.map((stop) => stop.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);
    const pad = 12;

    return payload.stops.map((stop, index) => {
      const x = pad + ((stop.lng - minLng) / lngSpan) * (100 - pad * 2);
      const y = 100 - (pad + ((stop.lat - minLat) / latSpan) * (100 - pad * 2));

      return {
        x,
        y,
        label: index + 1,
      };
    });
  }, [payload]);

  const polylinePoints = useMemo(
    () => previewPoints.map((point) => `${point.x},${point.y}`).join(" "),
    [previewPoints],
  );

  async function handleCopyLink() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92dvh] sm:max-w-2xl overflow-hidden border-white/10 bg-black/70 text-white backdrop-blur-2xl">
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                  {payload.name}
                </DialogTitle>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/55">
                  {payload.settings.city} · {payload.settings.vibe} · {payload.settings.timeWindow}
                </p>
              </div>
              <div className="rounded-lg bg-primary/20 px-3 py-1 text-sm font-semibold text-primary ring-1 ring-primary/30">
                Score {payload.score}/100
              </div>
            </div>
  
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
              <div className="relative h-52 w-full bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.14),transparent_35%),linear-gradient(160deg,rgba(10,16,30,0.95),rgba(8,20,35,0.85))]">
                {previewPoints.length > 0 ? (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <defs>
                      <linearGradient id="routeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(34,211,238,0.95)" />
                        <stop offset="100%" stopColor="rgba(56,189,248,0.9)" />
                      </linearGradient>
                    </defs>
                    {previewPoints.length > 1 ? (
                      <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="url(#routeStroke)"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {previewPoints.map((point) => (
                      <g key={`preview-stop-${point.label}`}>
                        <circle cx={point.x} cy={point.y} r="2.8" fill="rgba(8,15,26,0.95)" stroke="rgba(34,211,238,0.95)" strokeWidth="1.1" />
                        <text
                          x={point.x}
                          y={point.y + 0.8}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="2.8"
                          fill="rgba(186,230,253,0.96)"
                          fontWeight="700"
                        >
                          {point.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-white/50">
                    No map points available
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Itinerary</p>
                <p className="text-xs text-white/60">{payload.stops.length} stops</p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {payload.stops.map((stop, index) => (
                  <div
                    key={`${stop.id}-${index}`}
                    className="rounded-lg border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-white break-words">{index + 1}. {stop.name}</p>
                      <span className="text-[10px] font-semibold text-primary">
                        {stop.arrivalTime} to {stop.departureTime}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-white/55 break-words">{stop.address}</p>
                    <p className="mt-1 text-[10px] text-white/45">
                      {stop.travelMinutesFromPrevious}m transit · {stop.dwellMinutes}m stop
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2 ${onImport ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15"
            >
              <X className="h-4 w-4" />
              Close
            </button>
            {onImport ? (
              <button
                onClick={onImport}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/25 px-3 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/35"
              >
                <Upload className="h-4 w-4" />
                Import Trip
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
