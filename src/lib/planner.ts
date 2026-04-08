import {
  AutoFixSuggestion,
  PlanScoreBreakdown,
  Place,
  PlaceCategory,
  PlannedStop,
  PlannerPace,
  PlannerSettings,
  RouteData,
  TripBucketItem,
  TripWarningCode,
} from "@/types/places";

const MINUTES_IN_DAY = 24 * 60;

export const DEFAULT_DWELL_MINUTES_BY_PACE: Record<PlannerPace, number> = {
  relaxed: 90,
  balanced: 60,
  packed: 40,
};

export const TRIP_WARNING_METADATA: Record<
  TripWarningCode,
  { label: string; description: string; severity: "medium" | "high" }
> = {
  long_detour: {
    label: "Long detour",
    description: "This leg adds significant travel time.",
    severity: "medium",
  },
  tight_connection: {
    label: "Tight connection",
    description: "Travel time is high relative to the stop duration.",
    severity: "medium",
  },
  late_finish: {
    label: "Late finish",
    description: "This stop pushes your plan well into late night.",
    severity: "high",
  },
};

export interface PlannerComputation {
  stops: PlannedStop[];
  score: PlanScoreBreakdown;
  totals: {
    travelMinutes: number;
    dwellMinutes: number;
    durationMinutes: number;
    distanceKm: number;
  };
}

const VIBE_CATEGORY_PRIORITY: Record<string, PlaceCategory[]> = {
  "night out": ["dining", "cafe", "attraction"],
  "food crawl": ["dining", "cafe"],
  "coffee crawl": ["cafe", "dining"],
  "culture walk": ["historic", "attraction", "cafe"],
  "nature reset": ["nature", "attraction", "cafe"],
  "romantic": ["dining", "attraction", "historic"],
};

function normalizeVibeKey(vibe: string): string {
  return vibe.trim().toLowerCase();
}

function getPreferredCategories(vibe: string): PlaceCategory[] {
  return VIBE_CATEGORY_PRIORITY[normalizeVibeKey(vibe)] ?? ["dining", "cafe", "attraction"];
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(from: Place, to: Place): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);

  const fromLatRad = toRadians(from.lat);
  const toLatRad = toRadians(to.lat);

  const arc =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  const centralAngle = 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
  return earthRadiusKm * centralAngle;
}

function estimateTransitMinutes(
  previousPlace: Place | undefined,
  candidatePlace: Place,
  nextPlace: Place | undefined,
): number {
  const walkingMinutesPerKm = 12;
  let totalDistanceKm = 0;

  if (previousPlace) {
    totalDistanceKm += haversineDistanceKm(previousPlace, candidatePlace);
  }

  if (nextPlace) {
    totalDistanceKm += haversineDistanceKm(candidatePlace, nextPlace);
  }

  return Math.max(0, Math.round(totalDistanceKm * walkingMinutesPerKm));
}

function scoreReplacementCandidate(
  stop: PlannedStop,
  currentPlace: Place,
  candidate: Place,
  previousPlace: Place | undefined,
  nextPlace: Place | undefined,
  preferredCategories: PlaceCategory[],
): number {
  const transitMinutes = estimateTransitMinutes(previousPlace, candidate, nextPlace);
  const sameCategoryBonus = candidate.category === currentPlace.category ? 8 : 0;
  const vibeBonus = preferredCategories.includes(candidate.category) ? 6 : -4;
  const ratingBonus = (candidate.rating ?? 3.6) * 4;

  const detourPenaltyFactor = stop.warnings.includes("long_detour") ? 1.9 : 1.5;
  const tightPenaltyFactor = stop.warnings.includes("tight_connection") ? 0.6 : 0.2;
  const latePenalty = stop.warnings.includes("late_finish")
    ? Math.max(0, transitMinutes - 12) * 0.8
    : 0;

  return (
    120 +
    sameCategoryBonus +
    vibeBonus +
    ratingBonus -
    transitMinutes * detourPenaltyFactor -
    transitMinutes * tightPenaltyFactor -
    latePenalty
  );
}

function getAutoFixReason(warnings: TripWarningCode[]): string {
  if (warnings.includes("long_detour")) {
    return "Closer replacement to reduce detour time across your route.";
  }

  if (warnings.includes("tight_connection")) {
    return "Better pacing fit with less transfer pressure between stops.";
  }

  if (warnings.includes("late_finish")) {
    return "Faster stop option to keep the itinerary on time.";
  }

  return "Better-aligned replacement based on your current vibe and route flow.";
}

export function buildAutoFixSuggestions(
  items: TripBucketItem[],
  plannedStops: PlannedStop[],
  candidatePlaces: Place[],
  settings: PlannerSettings,
): AutoFixSuggestion[] {
  if (items.length === 0 || plannedStops.length === 0 || candidatePlaces.length === 0) {
    return [];
  }

  const problematicStops = plannedStops.filter((stop) => stop.warnings.length > 0);
  if (problematicStops.length === 0) {
    return [];
  }

  const existingPlaceIds = new Set(items.map((item) => item.place.id));
  const dedupedCandidates = new Map<string, Place>();

  candidatePlaces.forEach((candidate) => {
    if (!existingPlaceIds.has(candidate.id)) {
      dedupedCandidates.set(candidate.id, candidate);
    }
  });

  const candidatePool = Array.from(dedupedCandidates.values());
  if (candidatePool.length === 0) {
    return [];
  }

  const preferredCategories = getPreferredCategories(settings.vibe);
  const suggestions: AutoFixSuggestion[] = [];

  problematicStops.forEach((stop) => {
    const stopIndex = items.findIndex((item) => item.id === stop.itemId);
    if (stopIndex === -1) return;

    const currentPlace = items[stopIndex].place;
    const previousPlace = items[stopIndex - 1]?.place;
    const nextPlace = items[stopIndex + 1]?.place;

    const baselineScore = scoreReplacementCandidate(
      stop,
      currentPlace,
      currentPlace,
      previousPlace,
      nextPlace,
      preferredCategories,
    );

    let bestCandidate: { place: Place; score: number } | null = null;

    candidatePool.forEach((candidate) => {
      const score = scoreReplacementCandidate(
        stop,
        currentPlace,
        candidate,
        previousPlace,
        nextPlace,
        preferredCategories,
      );

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { place: candidate, score };
      }
    });

    if (!bestCandidate) return;

    const improvement = bestCandidate.score - baselineScore;
    if (improvement <= 2) return;

    suggestions.push({
      itemId: stop.itemId,
      candidate: bestCandidate.place,
      reason: getAutoFixReason(stop.warnings),
      confidence: clamp(Math.round(60 + improvement * 1.4), 45, 95),
      estimatedScoreDelta: clamp(Math.round(improvement / 3), 2, 25),
      warningCodes: stop.warnings,
    });
  });

  return suggestions.sort((a, b) => b.estimatedScoreDelta - a.estimatedScoreDelta);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
}

export function parseClockToMinutes(clock: string): number {
  const [rawHours, rawMinutes] = clock.split(":");
  const hours = Number.parseInt(rawHours ?? "18", 10);
  const minutes = Number.parseInt(rawMinutes ?? "0", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 18 * 60;
  }

  return clamp(hours, 0, 23) * 60 + clamp(minutes, 0, 59);
}

export function formatMinutesAsClock(minutes: number): string {
  const wrapped = wrapMinutes(minutes);
  const hours = Math.floor(wrapped / 60)
    .toString()
    .padStart(2, "0");
  const mins = (wrapped % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export function normalizeDwellMinutes(
  dwellMinutes: number | undefined,
  pace: PlannerPace,
): number {
  const fallback = DEFAULT_DWELL_MINUTES_BY_PACE[pace];
  if (typeof dwellMinutes !== "number" || Number.isNaN(dwellMinutes)) {
    return fallback;
  }

  return clamp(Math.round(dwellMinutes), 20, 240);
}

function collectWarnings(
  travelMinutes: number,
  dwellMinutes: number,
  departureMinutes: number,
): TripWarningCode[] {
  const warnings: TripWarningCode[] = [];

  if (travelMinutes >= 35) {
    warnings.push("long_detour");
  }

  if (travelMinutes >= Math.max(25, Math.round(dwellMinutes * 0.8))) {
    warnings.push("tight_connection");
  }

  if (departureMinutes >= 23 * 60 + 30) {
    warnings.push("late_finish");
  }

  return warnings;
}

export function buildPlannedStops(
  items: TripBucketItem[],
  routeData: RouteData | null,
  settings: PlannerSettings,
): PlannedStop[] {
  const startMinutes = parseClockToMinutes(settings.startTime);
  let cursorMinutes = startMinutes;

  return items.map((item, index) => {
    const dwellMinutes = normalizeDwellMinutes(item.dwellMinutes, settings.pace);
    const travelSeconds = index === 0 ? 0 : routeData?.legs[index - 1]?.duration ?? 0;
    const travelMinutesFromPrevious = Math.max(0, Math.round(travelSeconds / 60));

    const arrivalMinutes = cursorMinutes + travelMinutesFromPrevious;
    const departureMinutes = arrivalMinutes + dwellMinutes;

    const warnings = collectWarnings(
      travelMinutesFromPrevious,
      dwellMinutes,
      departureMinutes,
    );

    cursorMinutes = departureMinutes;

    return {
      itemId: item.id,
      place: item.place,
      order: index,
      arrivalTime: formatMinutesAsClock(arrivalMinutes),
      departureTime: formatMinutesAsClock(departureMinutes),
      dwellMinutes,
      travelMinutesFromPrevious,
      warnings,
    };
  });
}

export function calculatePlanScore(
  plannedStops: PlannedStop[],
  settings: PlannerSettings,
): PlanScoreBreakdown {
  if (plannedStops.length === 0) {
    return {
      overall: 0,
      feasibility: 0,
      pacing: 0,
      efficiency: 0,
      variety: 0,
      warningCount: 0,
    };
  }

  const targetDwell = DEFAULT_DWELL_MINUTES_BY_PACE[settings.pace];
  const totalDwellMinutes = plannedStops.reduce(
    (sum, stop) => sum + stop.dwellMinutes,
    0,
  );
  const totalTravelMinutes = plannedStops.reduce(
    (sum, stop) => sum + stop.travelMinutesFromPrevious,
    0,
  );

  const averageDwell = totalDwellMinutes / plannedStops.length;
  const pacingDeviation = Math.abs(averageDwell - targetDwell);
  const pacing = clamp(Math.round(100 - pacingDeviation * 1.2), 0, 100);

  const efficiencyRatio = totalTravelMinutes / Math.max(totalDwellMinutes, 1);
  const efficiency = clamp(Math.round(100 - efficiencyRatio * 140), 0, 100);

  const warningCount = plannedStops.reduce(
    (sum, stop) => sum + stop.warnings.length,
    0,
  );
  const feasibility = clamp(Math.round(100 - warningCount * 14), 0, 100);

  const uniqueCategoryCount = new Set(plannedStops.map((stop) => stop.place.category))
    .size;
  const varietyBase = Math.min(plannedStops.length, 4);
  const varietyRaw = varietyBase === 0 ? 100 : (uniqueCategoryCount / varietyBase) * 100;
  const variety = clamp(Math.round(varietyRaw), 35, 100);

  const overall = clamp(
    Math.round(
      feasibility * 0.35 + efficiency * 0.25 + pacing * 0.2 + variety * 0.2,
    ),
    0,
    100,
  );

  return {
    overall,
    feasibility,
    pacing,
    efficiency,
    variety,
    warningCount,
  };
}

export function computePlanner(
  items: TripBucketItem[],
  routeData: RouteData | null,
  settings: PlannerSettings,
): PlannerComputation {
  const stops = buildPlannedStops(items, routeData, settings);
  const score = calculatePlanScore(stops, settings);

  const travelMinutes = stops.reduce(
    (sum, stop) => sum + stop.travelMinutesFromPrevious,
    0,
  );
  const dwellMinutes = stops.reduce((sum, stop) => sum + stop.dwellMinutes, 0);

  return {
    stops,
    score,
    totals: {
      travelMinutes,
      dwellMinutes,
      durationMinutes: travelMinutes + dwellMinutes,
      distanceKm: routeData ? Number((routeData.distance / 1000).toFixed(1)) : 0,
    },
  };
}
