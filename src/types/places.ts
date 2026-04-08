export interface Place {
  id: string;
  originalId?: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  address: string;
  tags: string[];
  rating?: number;
  imageUrl?: string;
  notes?: string;
  mediaLinks?: string[];
  createdAt: string;
  category: PlaceCategory;
}

export type PlaceCategory = 
  | "accommodation" 
  | "dining" 
  | "attraction" 
  | "transport" 
  | "cafe" 
  | "nature" 
  | "historic" 
  | "other";

export interface TripBucketItem {
  id: string;
  place: Place;
  order: number;
  day?: number;
  time?: string;
  dwellMinutes?: number;
}

export type PlannerPace = "relaxed" | "balanced" | "packed";

export type DiscoveryTimeWindow =
  | "morning"
  | "afternoon"
  | "evening"
  | "late-night";

export type RouteMode = "fixed" | "optimize";

export type TripWarningCode = "long_detour" | "tight_connection" | "late_finish";

export interface PlannerSettings {
  city: string;
  vibe: string;
  startTime: string;
  timeWindow: DiscoveryTimeWindow;
  pace: PlannerPace;
}

export interface DiscoveryContext {
  city: string;
  vibe: string;
  timeWindow: DiscoveryTimeWindow;
}

export interface PlannedStop {
  itemId: string;
  place: Place;
  order: number;
  arrivalTime: string;
  departureTime: string;
  dwellMinutes: number;
  travelMinutesFromPrevious: number;
  warnings: TripWarningCode[];
}

export interface PlanScoreBreakdown {
  overall: number;
  feasibility: number;
  pacing: number;
  efficiency: number;
  variety: number;
  warningCount: number;
}

export interface AutoFixSuggestion {
  itemId: string;
  candidate: Place;
  reason: string;
  confidence: number;
  estimatedScoreDelta: number;
  warningCodes: TripWarningCode[];
}

export interface RouteLegData {
  distance: number;
  duration: number;
  fromIndex: number;
  toIndex: number;
  fromPlaceId?: string;
  toPlaceId?: string;
}

export interface RouteData {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
    type: "LineString";
  };
  legs: RouteLegData[];
  waypointOrder: number[];
  source: "route" | "trip";
}

export interface Trip {
  id: string;
  name: string;
  items: TripBucketItem[];
  createdAt: string;
}

export type MapView = "my-places" | "friends" | "public";

export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  dining: "#f97316",
  cafe: "#a855f7",
  accommodation: "#3b82f6",
  attraction: "#14b8a6",
  historic: "#ec4899",
  transport: "#eab308",
  nature: "#22c55e",
  other: "#8b5cf6",
};

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  dining: "🍽️",
  cafe: "☕",
  accommodation: "🏨",
  attraction: "🏛️",
  historic: "🏛️",
  transport: "🚄",
  nature: "🌿",
  other: "📍",
};
