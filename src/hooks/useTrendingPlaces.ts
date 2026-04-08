import { useQuery } from '@tanstack/react-query';
import {
  DiscoveryContext,
  DiscoveryTimeWindow,
  Place,
  PlaceCategory,
} from '@/types/places';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_DISCOVERY_CONTEXT: DiscoveryContext = {
  city: 'Bangalore',
  vibe: 'Night Out',
  timeWindow: 'evening',
};

const TIME_WINDOW_HINTS: Record<DiscoveryTimeWindow, string> = {
  morning: 'morning plan',
  afternoon: 'afternoon hangout',
  evening: 'evening outing',
  'late-night': 'late night spots',
};

const VIBE_QUERY_HINTS: Record<string, string> = {
  'night out': 'restobars and lounges',
  'coffee crawl': 'cafes and bakeries',
  'culture walk': 'museums and landmarks',
  'nature reset': 'parks and scenic viewpoints',
  'food crawl': 'local food hotspots',
  romantic: 'romantic dining and views',
};

const VIBE_CATEGORY_MAP: Record<string, PlaceCategory[]> = {
  'night out': ['dining', 'cafe', 'attraction'],
  'coffee crawl': ['cafe', 'dining'],
  'culture walk': ['historic', 'attraction'],
  'nature reset': ['nature', 'attraction'],
  'food crawl': ['dining', 'cafe'],
  romantic: ['dining', 'historic', 'attraction'],
};

let placesServiceInstance: any = null;

function normalizeDiscoveryContext(
  contextOverrides?: Partial<DiscoveryContext>,
): DiscoveryContext {
  return {
    city: contextOverrides?.city?.trim() || DEFAULT_DISCOVERY_CONTEXT.city,
    vibe: contextOverrides?.vibe?.trim() || DEFAULT_DISCOVERY_CONTEXT.vibe,
    timeWindow: contextOverrides?.timeWindow || DEFAULT_DISCOVERY_CONTEXT.timeWindow,
  };
}

function normalizeVibeKey(vibe: string): string {
  return vibe.trim().toLowerCase();
}

function buildTrendingQuery(context: DiscoveryContext): string {
  const vibeKey = normalizeVibeKey(context.vibe);
  const vibeHint = VIBE_QUERY_HINTS[vibeKey] || 'popular places';
  const timeHint = TIME_WINDOW_HINTS[context.timeWindow];
  return `Top rated ${vibeHint} for ${timeHint} in ${context.city}`;
}

function initGoogleMapsService(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) {
      if (!placesServiceInstance) {
        placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
      }
      return resolve(placesServiceInstance);
    }
    
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      const interval = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          clearInterval(interval);
          placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
          resolve(placesServiceInstance);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
      resolve(placesServiceInstance);
    };
    script.onerror = () => {
      reject(new Error("Failed to load Google Maps JS SDK"));
    };
    document.head.appendChild(script);
  });
}

function mapGoogleTypeToCategory(types: string[]): PlaceCategory {
  if (!types || types.length === 0) return 'other';

  const typeMap: Record<string, PlaceCategory> = {
    restaurant: 'dining',
    cafe: 'cafe',
    bar: 'dining',
    lodging: 'accommodation',
    hotel: 'accommodation',
    museum: 'historic',
    park: 'nature',
    tourist_attraction: 'attraction',
    airport: 'transport',
    train_station: 'transport',
    transit_station: 'transport',
  };

  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }

  return 'other';
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function useTrendingPlaces(contextOverrides?: Partial<DiscoveryContext>) {
  const context = normalizeDiscoveryContext(contextOverrides);
  const preferredCategories =
    VIBE_CATEGORY_MAP[normalizeVibeKey(context.vibe)] ||
    ['dining', 'cafe', 'attraction'];

  return useQuery({
    queryKey: ['trendingPlaces', context.city, context.vibe, context.timeWindow],
    queryFn: async (): Promise<Place[]> => {
      if (GOOGLE_API_KEY) {
        const service = await initGoogleMapsService();
        return new Promise<Place[]>((resolve, reject) => {
          service.textSearch({ query: buildTrendingQuery(context) }, (results: any[], status: string) => {
            if (status !== 'OK' && status !== 'ZERO_RESULTS') {
              console.error("Google Places Error:", status);
              return reject(new Error(`Google Places API returned status: ${status}`));
            }
            if (!results) return resolve([]);

            const mappedPlaces = results.map((p) => {
              let imageUrl = undefined;
              if (p.photos && p.photos.length > 0) {
                imageUrl = p.photos[0].getUrl({ maxWidth: 400 });
              }

              const vibeTag = normalizeVibeKey(context.vibe).replace(/\s+/g, '-');

              return {
                id: `google-trending-${p.place_id}`,
                originalId: p.place_id,
                name: p.name || 'Unknown Place',
                address: p.formatted_address || 'Unknown Address',
                lat: p.geometry?.location?.lat() || 0,
                lng: p.geometry?.location?.lng() || 0,
                category: mapGoogleTypeToCategory(p.types || []),
                rating: p.rating,
                imageUrl,
                tags: ['trending', vibeTag, context.timeWindow],
                createdAt: new Date().toISOString(),
              };
            });

            const categoryScoped = mappedPlaces.filter((place) =>
              preferredCategories.includes(place.category),
            );

            const sourcePool = categoryScoped.length >= 5 ? categoryScoped : mappedPlaces;
            const randomizedTop = shuffleArray(
              sourcePool
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 12),
            ).slice(0, 6);

            resolve(randomizedTop);
          });
        });
      } else {
        // Fallback to Photon
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(`${context.vibe} ${context.timeWindow} ${context.city}`)}&limit=15`,
        );
        if (!res.ok) throw new Error('Photon search failed');
        const data = await res.json();
        
        const randomPick = shuffleArray(data.features).slice(0, 5);
        
        return randomPick.map((f: any) => {
          const p = f.properties;
          const addressParts = [p.street, p.city, p.state, p.country].filter(Boolean);
          const address = addressParts.join(', ') || 'Unknown Address';

          return {
            id: `trending-${p.osm_id || Math.random()}`,
            originalId: p.osm_id?.toString(),
            name: p.name || 'Unknown Place',
            address,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            category: 'dining',
            rating: undefined,
            tags: ['trending', normalizeVibeKey(context.vibe).replace(/\s+/g, '-'), context.timeWindow],
            createdAt: new Date().toISOString(),
          };
        });
      }
    },
    // Keep it cached to prevent burning quota on every refresh!
    staleTime: 1000 * 60 * 60 * 12, 
    gcTime: 1000 * 60 * 60 * 12,
  });
}
