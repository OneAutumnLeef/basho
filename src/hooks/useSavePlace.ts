import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
            redirectTo: window.location.href.split('#')[0].split('?')[0] // Return to current page without hash/params
          }
        });
        
        if (authError) {
          alert(`Google Auth failed: ${authError.message}`);
        }
        return null;
      }

      // 2. Insert into global places if it's from global search (we assume it's new if originalId exists but not in our DB maybe)
      // Actually, we can do an upsert on places table based on originalId or just insert returning id.
      // We will just do a simple insert into places.
      const { data: globalPlace, error: placeError } = await supabase
        .from('places')
        .insert({
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          category: place.category,
          image_url: place.imageUrl,
        })
        .select()
        .single();

      if (placeError) throw placeError;

      // 3. Link to user_saved_places
      const { error: linkError } = await supabase
        .from('user_saved_places')
        .insert({
          user_id: session.user.id,
          place_id: globalPlace.id,
          tags: place.tags || [],
        });

      if (linkError) throw linkError;

      return globalPlace;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["places"] });
      }
    },
  });
}
