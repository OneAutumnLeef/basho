import { useQuery } from '@tanstack/react-query';
import { Place } from '@/types/places';

interface RouteData {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    coordinates: [number, number][]; // [lon, lat]
    type: "LineString";
  };
}

export function useRoute(places: Place[]) {
  return useQuery({
    queryKey: ['route', places.map(p => p.id).join(',')],
    queryFn: async (): Promise<RouteData | null> => {
      if (places.length < 2) return null;
      
      const coordinates = places.map(p => `${p.lng},${p.lat}`).join(';');
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/walking/${coordinates}?overview=full&geometries=geojson`
      );
      
      if (!response.ok) throw new Error("Failed to fetch route");
      
      const data = await response.json();
      
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("No route found");
      }

      return data.routes[0];
    },
    enabled: places.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
