import {
  AutoFixSuggestion,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  PlanScoreBreakdown,
  PlannedStop,
  PlannerSettings,
  RouteData,
  RouteMode,
  TripBucketItem,
} from "@/types/places";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ChevronRight, Clock, Download, GripVertical, LogIn, LogOut, Navigation, Route, Save, Share2, ThumbsDown, ThumbsUp, WandSparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TRIP_WARNING_METADATA } from "@/lib/planner";
import { SavedTripSummary, TripVoteInsights, TripVoteSummary } from "@/types/trips";

interface TripBucketProps {
  items: TripBucketItem[];
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  routeData?: RouteData | null;
  onOptimizeRoute: () => void | Promise<void>;
  isLoadingRoute?: boolean;
  plannerSettings?: PlannerSettings;
  onPlannerSettingsChange?: (updates: Partial<PlannerSettings>) => void;
  routeMode?: RouteMode;
  onRouteModeChange?: (mode: RouteMode) => void;
  planStops?: PlannedStop[];
  planScore?: PlanScoreBreakdown;
  onUpdateDwellMinutes?: (itemId: string, dwellMinutes: number) => void;
  suggestions?: AutoFixSuggestion[];
  onApplySuggestion?: (itemId: string, suggestion: AutoFixSuggestion) => void;
  tripName?: string;
  onTripNameChange?: (value: string) => void;
  savedTrips?: SavedTripSummary[];
  selectedTripId?: string | null;
  onSelectedTripIdChange?: (tripId: string) => void;
  onSaveTrip?: () => void | Promise<void>;
  onLoadTrip?: () => void | Promise<void>;
  onShareTrip?: () => void;
  isSavingTrip?: boolean;
  isLoadingTripLibrary?: boolean;
  isLoadingSelectedTrip?: boolean;
  voteSummaryByPlaceKey?: Record<string, TripVoteSummary>;
  onVotePlace?: (placeKey: string, placeName: string, vote: -1 | 1) => void;
  isVoting?: boolean;
  voteInsights?: TripVoteInsights;
  voteDisabledReason?: string | null;
  authEmail?: string | null;
  isAuthenticated?: boolean;
  onSignIn?: () => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
  isAuthActionPending?: boolean;
  isSupabaseConfigured?: boolean;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function SortableItem({
  item,
  plannedStop,
  suggestion,
  voteSummary,
  onRemove,
  onUpdateDwellMinutes,
  onApplySuggestion,
  onVotePlace,
  isVoting,
}: {
  item: TripBucketItem;
  plannedStop?: PlannedStop;
  suggestion?: AutoFixSuggestion;
  voteSummary?: TripVoteSummary;
  onRemove: () => void;
  onUpdateDwellMinutes?: (value: number) => void;
  onApplySuggestion?: () => void;
  onVotePlace?: (vote: -1 | 1) => void;
  isVoting?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const dwellMinutes = item.dwellMinutes ?? plannedStop?.dwellMinutes ?? 60;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 group transition-colors hover:bg-white/10 ${isDragging ? "shadow-2xl ring-1 ring-primary/50" : "shadow-sm"}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-white/30 hover:text-white/70 active:cursor-grabbing transition-colors">
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-base flex-shrink-0 bg-black/40 ring-1 ring-white/10 shadow-inner"
        style={{ color: CATEGORY_COLORS[item.place.category] }}
      >
        {CATEGORY_ICONS[item.place.category]}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
        <div>
          <p className="text-sm font-semibold leading-snug text-white tracking-wide break-words">{item.place.name}</p>
          <p className="mt-1 text-[10px] leading-snug text-white/60 break-words">{item.place.address}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 ring-1 ring-white/10">
            {plannedStop ? `${plannedStop.arrivalTime} -> ${plannedStop.departureTime}` : "Time pending"}
          </span>
          <span className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
            {plannedStop?.travelMinutesFromPrevious ?? 0}m travel
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Stop</label>
          <input
            type="number"
            min={20}
            max={240}
            step={5}
            value={dwellMinutes}
            onChange={(event) => onUpdateDwellMinutes?.(Number(event.target.value))}
            className="h-7 w-16 rounded-md border border-white/10 bg-black/30 px-2 text-[11px] font-semibold text-white outline-none focus:border-primary/60"
          />
          <span className="text-[10px] text-white/40">min</span>
        </div>

        {plannedStop?.warnings.length ? (
          <div className="flex flex-wrap gap-1.5">
            {plannedStop.warnings.map((warning) => {
              const metadata = TRIP_WARNING_METADATA[warning];
              const toneClass =
                metadata.severity === "high"
                  ? "bg-red-500/20 text-red-200 ring-red-400/30"
                  : "bg-amber-500/20 text-amber-200 ring-amber-400/30";

              return (
                <span
                  key={`${item.id}-${warning}`}
                  title={metadata.description}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ${toneClass}`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {metadata.label}
                </span>
              );
            })}
          </div>
        ) : null}

        {suggestion ? (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2.5">
            <button
              onClick={onApplySuggestion}
              className="flex w-full items-center justify-between gap-2 rounded-md bg-emerald-500/15 px-2 py-1.5 text-left text-[11px] font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25"
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <WandSparkles className="h-3.5 w-3.5" />
                Replace with {suggestion.candidate.name}
              </span>
              <span className="text-[10px] text-emerald-200/80">+{suggestion.estimatedScoreDelta}</span>
            </button>
            <p className="mt-1 text-[10px] text-emerald-100/75">
              {suggestion.reason} ({suggestion.confidence}% confidence)
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5">
          <div className="text-[10px] text-white/60">
            Votes <span className="font-semibold text-white">{voteSummary?.score ?? 0}</span>
            <span className="ml-1 text-white/40">({voteSummary?.voterCount ?? 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onVotePlace?.(1)}
              disabled={!onVotePlace || isVoting}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                voteSummary?.myVote === 1
                  ? "bg-emerald-500/25 text-emerald-200"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              } disabled:opacity-50`}
              title="Upvote stop"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onVotePlace?.(-1)}
              disabled={!onVotePlace || isVoting}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                voteSummary?.myVote === -1
                  ? "bg-rose-500/25 text-rose-200"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              } disabled:opacity-50`}
              title="Downvote stop"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-destructive/20 hover:text-destructive transition-all"
        title="Remove stop"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function TripBucket({
  items,
  onRemove,
  isOpen,
  onToggle,
  routeData,
  onOptimizeRoute,
  isLoadingRoute,
  plannerSettings,
  onPlannerSettingsChange,
  routeMode = "optimize",
  onRouteModeChange,
  planStops = [],
  planScore,
  onUpdateDwellMinutes,
  suggestions = [],
  onApplySuggestion,
  tripName = "My Trip",
  onTripNameChange,
  savedTrips = [],
  selectedTripId,
  onSelectedTripIdChange,
  onSaveTrip,
  onLoadTrip,
  onShareTrip,
  isSavingTrip,
  isLoadingTripLibrary,
  isLoadingSelectedTrip,
  voteSummaryByPlaceKey = {},
  onVotePlace,
  isVoting,
  voteInsights,
  voteDisabledReason,
  authEmail,
  isAuthenticated,
  onSignIn,
  onSignOut,
  isAuthActionPending,
  isSupabaseConfigured,
}: TripBucketProps) {
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: 'trip-bucket-droppable',
  });

  const planStopById = new Map(planStops.map((stop) => [stop.itemId, stop]));
  const suggestionByItemId = new Map(suggestions.map((suggestion) => [suggestion.itemId, suggestion]));
  const score =
    planScore ??
    ({
      overall: 0,
      feasibility: 0,
      pacing: 0,
      efficiency: 0,
      variety: 0,
      warningCount: 0,
    } satisfies PlanScoreBreakdown);

  // Use actual routedata from OSRM if available
  const totalDistance = routeData?.distance 
    ? `${(routeData.distance / 1000).toFixed(1)} km` 
    : items.length > 1 ? `${(items.length * 2.3).toFixed(1)} km` : "—";
    
  const routeTravelTime = routeData?.duration 
    ? `${Math.round(routeData.duration / 60)} min` 
    : items.length > 1 ? `${items.length * 18} min` : "—";

  const itineraryTotalMinutes = planStops.reduce(
    (sum, stop) => sum + stop.travelMinutesFromPrevious + stop.dwellMinutes,
    0,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute inset-x-2 top-2 bottom-2 z-[600] flex min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-2xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl [-webkit-overflow-scrolling:touch] touch-pan-y custom-scrollbar sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[min(24rem,calc(100vw-2rem))]"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 sm:p-5">
            <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-heading font-semibold text-white tracking-wide">Trip Bucket</h2>
              <p className="text-xs text-white/50 font-medium tracking-wider uppercase mt-1">{items.length} Stops Planned</p>
            </div>
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-lg border border-white/10 bg-black/35 px-2.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Account</p>
                    <p className="truncate text-[11px] text-white/85">
                      {isAuthenticated
                        ? authEmail || "Signed in"
                        : isSupabaseConfigured
                          ? "Not signed in"
                          : "Supabase unavailable"}
                    </p>
                  </div>
                  <button
                    onClick={isAuthenticated ? onSignOut : onSignIn}
                    disabled={Boolean(isAuthActionPending) || !isSupabaseConfigured}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAuthenticated ? <LogOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                    {isAuthenticated ? "Sign Out" : "Sign In"}
                  </button>
                </div>
              </div>

              <input
                value={tripName}
                onChange={(event) => onTripNameChange?.(event.target.value)}
                placeholder="Trip name"
                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs font-semibold text-white placeholder:text-white/40 outline-none focus:border-primary/50"
              />
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  onClick={onSaveTrip}
                  disabled={isSavingTrip || items.length === 0}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-primary/90 px-2 py-2 text-[10px] sm:text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingTrip ? "Saving" : "Save"}
                </button>
                <button
                  onClick={onLoadTrip}
                  disabled={isLoadingSelectedTrip || !selectedTripId}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-white/10 px-2 py-2 text-[10px] sm:text-[11px] font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Load
                </button>
                <button
                  onClick={onShareTrip}
                  disabled={items.length === 0}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500/25 px-2 py-2 text-[10px] sm:text-[11px] font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>
              <select
                value={selectedTripId || ""}
                onChange={(event) => onSelectedTripIdChange?.(event.target.value)}
                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs font-semibold text-white outline-none focus:border-primary/50"
              >
                <option value="">{isLoadingTripLibrary ? "Loading trips..." : "Select saved trip..."}</option>
                {savedTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name} · {trip.itemCount} stops
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mx-4 mt-4 grid shrink-0 grid-cols-2 gap-2.5 sm:mx-5 sm:gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Start</label>
              <input
                type="time"
                value={plannerSettings?.startTime ?? "18:30"}
                onChange={(event) => onPlannerSettingsChange?.({ startTime: event.target.value })}
                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs font-semibold text-white outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/45">Pace</label>
              <select
                value={plannerSettings?.pace ?? "balanced"}
                onChange={(event) =>
                  onPlannerSettingsChange?.({
                    pace: event.target.value as PlannerSettings["pace"],
                  })
                }
                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-xs font-semibold text-white outline-none focus:border-primary/50"
              >
                <option value="relaxed">Relaxed</option>
                <option value="balanced">Balanced</option>
                <option value="packed">Packed</option>
              </select>
            </div>
          </div>

          <div className="mx-4 mt-3 flex shrink-0 rounded-lg border border-white/10 bg-black/30 p-1 sm:mx-5">
            <button
              onClick={() => onRouteModeChange?.("fixed")}
              className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                routeMode === "fixed"
                  ? "bg-white/15 text-white"
                  : "text-white/45 hover:text-white/80"
              }`}
            >
              Keep Order
            </button>
            <button
              onClick={() => onRouteModeChange?.("optimize")}
              className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                routeMode === "optimize"
                  ? "bg-primary/20 text-primary"
                  : "text-white/45 hover:text-white/80"
              }`}
            >
              Optimize
            </button>
          </div>

          {/* Route Summary */}
          {items.length > 1 && (
            <div className="mx-4 mt-5 flex shrink-0 justify-between rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-3.5 sm:mx-5 sm:p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-primary/70 uppercase tracking-widest font-bold">Total Distance</span>
                <div className="flex items-center gap-1.5">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-white">{totalDistance}</span>
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-primary/70 uppercase tracking-widest font-bold">Route Time</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-white">{routeTravelTime}</span>
                </div>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="mx-4 mt-4 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:mx-5 sm:p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Plan Quality</p>
                  <p className="text-2xl font-bold text-white mt-1">{score.overall}<span className="text-sm text-white/45">/100</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-white/45 uppercase tracking-widest">Itinerary Time</p>
                  <p className="text-sm font-semibold text-white mt-1">{itineraryTotalMinutes > 0 ? formatDuration(itineraryTotalMinutes) : "—"}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md bg-white/5 px-2 py-1.5 text-white/80">Feasibility <span className="text-white font-semibold">{score.feasibility}</span></div>
                <div className="rounded-md bg-white/5 px-2 py-1.5 text-white/80">Pacing <span className="text-white font-semibold">{score.pacing}</span></div>
                <div className="rounded-md bg-white/5 px-2 py-1.5 text-white/80">Efficiency <span className="text-white font-semibold">{score.efficiency}</span></div>
                <div className="rounded-md bg-white/5 px-2 py-1.5 text-white/80">Variety <span className="text-white font-semibold">{score.variety}</span></div>
              </div>

              {score.warningCount > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-100 ring-1 ring-amber-400/20">
                  <AlertTriangle className="h-3 w-3" />
                  {score.warningCount} warning{score.warningCount > 1 ? "s" : ""} in current plan
                </p>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="mx-4 mt-3 shrink-0 rounded-xl border border-white/10 bg-black/25 p-3 sm:mx-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Collab Pulse</p>
                <p className="text-[10px] font-semibold text-white/60">
                  {voteInsights?.totalVotes ?? 0} total votes
                </p>
              </div>

              {voteInsights?.top ? (
                <div className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/85">Top Voted</p>
                  <p className="truncate text-xs font-semibold text-emerald-100 mt-0.5">{voteInsights.top.placeName}</p>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5">Score {voteInsights.top.score} · {voteInsights.top.voterCount} voters</p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-white/55">No votes yet. Save a trip and start voting stops.</p>
              )}

              {voteInsights?.bottom && voteInsights.bottom.placeKey !== voteInsights.top?.placeKey ? (
                <div className="mt-2 rounded-md border border-rose-400/20 bg-rose-500/10 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-200/85">Needs Love</p>
                  <p className="truncate text-xs font-semibold text-rose-100 mt-0.5">{voteInsights.bottom.placeName}</p>
                  <p className="text-[10px] text-rose-200/80 mt-0.5">Score {voteInsights.bottom.score} · {voteInsights.bottom.voterCount} voters</p>
                </div>
              ) : null}

              {voteDisabledReason ? (
                <p className="mt-2 text-[10px] text-amber-200/85">{voteDisabledReason}</p>
              ) : null}
            </div>
          )}

          {/* Items List */}
          <div className="space-y-3 p-4 sm:p-5">
            {items.length === 0 ? (
              <div ref={setDroppableRef} className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <Route className="h-7 w-7 text-white/30" />
                </div>
                <p className="text-sm font-medium text-white/80">Your bucket is empty</p>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">Drag places from the map or click + to start planning your itinerary.</p>
              </div>
            ) : (
              <div ref={setDroppableRef} className="min-h-[100px] w-full">
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, idx) => (
                    <div key={item.id} className="relative">
                      {idx > 0 && (
                        <div className="absolute -top-3 left-[17px] h-3 w-[1px] bg-white/10 border-l border-dashed border-white/20" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center mt-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <SortableItem
                            item={item}
                            plannedStop={planStopById.get(item.id)}
                            suggestion={suggestionByItemId.get(item.id)}
                            voteSummary={
                              voteSummaryByPlaceKey[item.place.originalId || item.place.id]
                            }
                            onUpdateDwellMinutes={(value) => onUpdateDwellMinutes?.(item.id, value)}
                            onApplySuggestion={() => {
                              const suggestion = suggestionByItemId.get(item.id);
                              if (suggestion) {
                                onApplySuggestion?.(item.id, suggestion);
                              }
                            }}
                            onVotePlace={(vote) =>
                              onVotePlace?.(
                                item.place.originalId || item.place.id,
                                item.place.name,
                                vote,
                              )
                            }
                            isVoting={isVoting}
                            onRemove={() => onRemove(item.id)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </div>
            )}
          </div>

          {/* Generate Route Button */}
          {items.length > 1 && (
            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/20">
              <button
                onClick={onOptimizeRoute}
                disabled={isLoadingRoute}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingRoute ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> Calculating...</>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    {routeMode === "optimize" ? "Generate Optimized Route" : "Generate Route"}
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
