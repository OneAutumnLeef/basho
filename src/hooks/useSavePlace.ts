import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/app-url";
import { Place } from "@/types/places";

export function useSavePlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (place: Place) => {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Trigger Google OAuth sign-in directly
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getAuthRedirectUrl(),
          }
        });
        
        if (authError) {
          alert(`Google Auth failed: ${authError.message}`);
        }
        return null;
      }

      // 2. Reuse an existing canonical place row if one matches this location.
      const { data: existingPlace, error: existingLookupError } = await supabase
        .from("places")
        .select("id,name,address,lat,lng,category,image_url,rating,created_at")
        .eq("name", place.name)
        .eq("address", place.address)
        .eq("lat", place.lat)
        .eq("lng", place.lng)
        .limit(1)
        .maybeSingle();

      if (existingLookupError) throw existingLookupError;

      let persistedPlace = existingPlace;

      if (!persistedPlace) {
        const { data: insertedPlace, error: insertPlaceError } = await supabase
          .from("places")
          .insert({
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            category: place.category,
            image_url: place.imageUrl,
            rating: place.rating,
          })
          .select("id,name,address,lat,lng,category,image_url,rating,created_at")
          .single();

        if (insertPlaceError) throw insertPlaceError;
        persistedPlace = insertedPlace;
      }

      // 3. Upsert save link to avoid duplicates and persist note/tag edits.
      const { error: linkError } = await supabase
        .from("user_saved_places")
        .upsert(
          {
            user_id: session.user.id,
            place_id: persistedPlace.id,
            custom_notes: place.notes?.trim() || null,
            tags: place.tags || [],
          },
          { onConflict: "user_id,place_id" },
        );

      if (linkError) throw linkError;

      return persistedPlace;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["places"] });
      }
    },
  });
}
