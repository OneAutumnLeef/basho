import {
  DiscoveryTimeWindow,
  Place,
  PlannerPace,
  PlannerSettings,
  RouteMode,
  TripBucketItem,
} from "@/types/places";

export type TripSource = "cloud" | "local";

export interface SavedTripSummary {
  id: string;
  name: string;
  city: string;
  vibe: string;
  timeWindow: DiscoveryTimeWindow;
  itemCount: number;
  updatedAt: string;
  source: TripSource;
}

export interface SavedTripData extends SavedTripSummary {
  createdAt: string;
  settings: PlannerSettings;
  routeMode: RouteMode;
  planScore: number;
  items: TripBucketItem[];
}

export interface SaveTripInput {
  tripId?: string | null;
  name: string;
  settings: PlannerSettings;
  routeMode: RouteMode;
  planScore: number;
  items: TripBucketItem[];
}

export interface ShareableTripStop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: Place["category"];
  arrivalTime: string;
  departureTime: string;
  dwellMinutes: number;
  travelMinutesFromPrevious: number;
}

export interface ShareableTripPayload {
  version: number;
  name: string;
  createdAt: string;
  settings: {
    city: string;
    vibe: string;
    timeWindow: DiscoveryTimeWindow;
    startTime: string;
    pace: PlannerPace;
  };
  routeMode: RouteMode;
  score: number;
  stops: ShareableTripStop[];
}

export interface TripVoteSummary {
  placeKey: string;
  score: number;
  upVotes: number;
  downVotes: number;
  myVote: -1 | 0 | 1;
  voterCount: number;
}

export interface VoteOnPlaceInput {
  tripId: string;
  placeKey: string;
  placeName?: string;
  vote: -1 | 1;
}

export interface TripVoteInsight {
  placeKey: string;
  placeName: string;
  score: number;
  voterCount: number;
}

export interface TripVoteInsights {
  totalVotes: number;
  top: TripVoteInsight | null;
  bottom: TripVoteInsight | null;
}

export interface SuggestionAuditInput {
  tripId: string;
  originalPlaceKey: string;
  suggestedPlaceKey: string;
  accepted: boolean;
  reason?: string;
}
