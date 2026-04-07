import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Place } from "@/types/places";

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    queryFn: async () => {
      // If we don't have a real Supabase URL initialized, return empty
      if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder-url.supabase.co') {
        console.warn('Supabase URL not provided, returning empty array.');
        return [];
      }

      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching places:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map Supabase rows to our precise frontend Place type
      return data.map(row => ({
        id: row.id,
        name: row.name,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        category: row.category as Place['category'],
        imageUrl: row.image_url,
        rating: row.rating,
        description: row.description || "",
        tags: [], // Tags would come from user_saved_places join
        createdAt: row.created_at || new Date().toISOString(),
        originalId: row.id
      })) as Place[];
    },
  });
}
