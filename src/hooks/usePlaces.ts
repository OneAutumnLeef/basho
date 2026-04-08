import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Place } from "@/types/places";

interface SavedPlaceRow {
  custom_notes: string | null;
  tags: string[] | null;
  created_at: string;
  place: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    category: Place["category"];
    image_url: string | null;
    rating: number | null;
    description?: string | null;
    created_at: string | null;
  } | null;
}

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    queryFn: async () => {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        return [];
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return [];
      }

      const { data, error } = await supabase
        .from("user_saved_places")
        .select(
          "custom_notes,tags,created_at,place:places(id,name,address,lat,lng,category,image_url,rating,created_at)",
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching places:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const mapped = (data as SavedPlaceRow[])
        .filter((row) => Boolean(row.place))
        .map((row) => {
          const place = row.place!;

          return {
            id: place.id,
            originalId: place.id,
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            category: place.category,
            imageUrl: place.image_url || undefined,
            rating: place.rating || undefined,
            notes: row.custom_notes || undefined,
            tags: row.tags || [],
            createdAt: row.created_at || place.created_at || new Date().toISOString(),
          } satisfies Place;
        });

      // Defensive dedupe for legacy duplicate place rows with identical location content.
      const deduped = new Map<string, Place>();

      mapped.forEach((place) => {
        const key = `${place.name}|${place.address}|${place.lat.toFixed(6)}|${place.lng.toFixed(6)}`;
        if (!deduped.has(key)) {
          deduped.set(key, place);
        }
      });

      return Array.from(deduped.values());
    },
  });
}
