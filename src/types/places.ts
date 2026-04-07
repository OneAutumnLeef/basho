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
