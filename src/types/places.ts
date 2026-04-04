export interface Place {
  id: string;
  name: string;
  description: string;
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
  | "restaurant" 
  | "cafe" 
  | "hotel" 
  | "attraction" 
  | "nightlife" 
  | "shopping" 
  | "nature" 
  | "museum";

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
  restaurant: "#f97316",
  cafe: "#a855f7",
  hotel: "#3b82f6",
  attraction: "#14b8a6",
  nightlife: "#ec4899",
  shopping: "#eab308",
  nature: "#22c55e",
  museum: "#8b5cf6",
};

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  hotel: "🏨",
  attraction: "🏛️",
  nightlife: "🌙",
  shopping: "🛍️",
  nature: "🌿",
  museum: "🎨",
};
