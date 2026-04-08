import { useQuery } from '@tanstack/react-query';
import { Place, RouteData, RouteLegData, RouteMode } from '@/types/places';

interface UseRouteOptions {
  mode?: RouteMode;
  profile?: 'walking' | 'driving' | 'cycling';
}

function defaultWaypointOrder(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

function buildLegs(
  places: Place[],
  orderedIndices: number[],
  routeLegs: Array<{ distance?: number; duration?: number }> | undefined,
): RouteLegData[] {
  if (!routeLegs?.length) return [];

  return routeLegs.map((leg, index) => {
    const fromIndex = orderedIndices[index] ?? index;
    const toIndex = orderedIndices[index + 1] ?? index + 1;

    return {
      distance: leg.distance ?? 0,
      duration: leg.duration ?? 0,
      fromIndex,
      toIndex,
      fromPlaceId: places[fromIndex]?.id,
      toPlaceId: places[toIndex]?.id,
    };
  });
}

function parseOptimizedWaypointOrder(
  waypoints: Array<{ waypoint_index?: number }> | undefined,
  placeCount: number,
): number[] {
  if (!Array.isArray(waypoints) || waypoints.length !== placeCount) {
    return defaultWaypointOrder(placeCount);
  }

  return waypoints
    .map((waypoint, originalIndex) => ({
      originalIndex,
      waypointIndex:
        typeof waypoint.waypoint_index === 'number'
          ? waypoint.waypoint_index
          : originalIndex,
    }))
    .sort((a, b) => a.waypointIndex - b.waypointIndex)
    .map((entry) => entry.originalIndex);
}

export function useRoute(places: Place[], options: UseRouteOptions = {}) {
  const { mode = 'fixed', profile = 'walking' } = options;

  return useQuery({
    queryKey: ['route', mode, profile, places.map((p) => p.id).join(',')],
    queryFn: async (): Promise<RouteData | null> => {
      if (places.length < 2) return null;
      
      const coordinates = places.map((place) => `${place.lng},${place.lat}`).join(';');

      if (mode === 'optimize') {
        const response = await fetch(
          `https://router.project-osrm.org/trip/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false&roundtrip=false&source=first&destination=last`,
        );

        if (!response.ok) throw new Error('Failed to fetch optimized route');

        const data = await response.json();
        const optimizedTrip = data?.trips?.[0];

        if (data?.code !== 'Ok' || !optimizedTrip) {
          throw new Error('No optimized route found');
        }

        const waypointOrder = parseOptimizedWaypointOrder(data.waypoints, places.length);

        return {
          distance: optimizedTrip.distance ?? 0,
          duration: optimizedTrip.duration ?? 0,
          geometry: optimizedTrip.geometry,
          legs: buildLegs(places, waypointOrder, optimizedTrip.legs),
          waypointOrder,
          source: 'trip',
        };
      }

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=false`,
      );

      if (!response.ok) throw new Error('Failed to fetch route');

      const data = await response.json();
      const route = data?.routes?.[0];

      if (data?.code !== 'Ok' || !route) {
        throw new Error('No route found');
      }

      const waypointOrder = defaultWaypointOrder(places.length);

      return {
        distance: route.distance ?? 0,
        duration: route.duration ?? 0,
        geometry: route.geometry,
        legs: buildLegs(places, waypointOrder, route.legs),
        waypointOrder,
        source: 'route',
      };
    },
    enabled: places.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
