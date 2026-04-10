import { useQuery } from '@tanstack/react-query';
import {
  DiscoveryContext,
  DiscoveryTimeWindow,
  Place,
  PlaceCategory,
} from '@/types/places';
import {
  buildPlacesCacheKey,
  canUseGooglePlaces,
  consumeGooglePlacesBudget,
  getCachedPlaces,
  getInFlightPlacesRequest,
  markPlacesNetworkRequest,
  setCachedPlaces,
  setInFlightPlacesRequest,
  shouldThrottlePlaces,
} from '@/lib/places-traffic-control';
import { canUsePlacesProxy, fetchPlacesFromProxy } from '@/lib/places-proxy-client';

const TRENDING_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

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

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ['bengaluru'],
  bengaluru: ['bangalore'],
};

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

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function normalizeAddressToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9]/g, '');
}

function buildCityTokens(city: string): string[] {
  const normalized = city.trim().toLowerCase();
  const aliases = CITY_ALIASES[normalized] || [];
  return Array.from(
    new Set(
      [normalized, ...aliases]
        .map((token) => normalizeAddressToken(token))
        .filter((token) => token.length > 2),
    ),
  );
}

function filterPlacesByCity(places: Place[], city: string): Place[] {
  const tokens = buildCityTokens(city);
  if (tokens.length === 0) return places;

  const matched = places.filter((place) => {
    const normalizedAddress = normalizeAddressToken(`${place.name || ''} ${place.address || ''}`);
    return tokens.some((token) => normalizedAddress.includes(token));
  });

  if (matched.length === 0) {
    return places;
  }

  const matchedIds = new Set(matched.map((place) => place.id));
  const unmatched = places.filter((place) => !matchedIds.has(place.id));
  return [...matched, ...unmatched];
}

async function fetchTrendingWithPhoton(context: DiscoveryContext): Promise<Place[]> {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(`${context.vibe} ${context.timeWindow} ${context.city}`)}&limit=15`,
  );
  if (!response.ok) throw new Error('Photon search failed');

  const data = await response.json();
  const randomPick = shuffleArray(data.features).slice(0, 5);

  const mapped = randomPick.map((feature: any) => {
    const props = feature.properties;
    const addressParts = [props.street, props.city, props.state, props.country].filter(Boolean);
    const address = addressParts.join(', ') || 'Unknown Address';

    return {
      id: `trending-${props.osm_id || Math.random()}`,
      originalId: props.osm_id?.toString(),
      name: props.name || 'Unknown Place',
      address,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      category: 'dining',
      rating: undefined,
      tags: ['trending', normalizeVibeKey(context.vibe).replace(/\s+/g, '-'), context.timeWindow],
      createdAt: new Date().toISOString(),
    };
  });

  return filterPlacesByCity(mapped, context.city);
}

export function useTrendingPlaces(
  contextOverrides?: Partial<DiscoveryContext>,
  options?: { enabled?: boolean },
) {
  const context = normalizeDiscoveryContext(contextOverrides);
  const preferredCategories =
    VIBE_CATEGORY_MAP[normalizeVibeKey(context.vibe)] ||
    ['dining', 'cafe', 'attraction'];
  const cacheKey = buildPlacesCacheKey('trending', [context.city, context.vibe, context.timeWindow]);
  const isEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['trendingPlaces', context.city, context.vibe, context.timeWindow],
    queryFn: async (): Promise<Place[]> => {
      if (context.city.trim().length < 2) {
        return [];
      }

      const cachedResults = getCachedPlaces(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      const inFlight = getInFlightPlacesRequest(cacheKey);
      if (inFlight) {
        return inFlight;
      }

      const networkRequest = (async () => {
        const shouldUseProxy =
          canUsePlacesProxy() &&
          canUseGooglePlaces('trending') &&
          !shouldThrottlePlaces('trending', cacheKey);

        if (shouldUseProxy) {
          try {
            markPlacesNetworkRequest('trending', cacheKey);
            consumeGooglePlacesBudget('trending');

            const proxyResults = await fetchPlacesFromProxy({
              endpoint: 'trending',
              context,
              query: buildTrendingQuery(context),
            });

            if (proxyResults.length === 0) {
              const fallbackResults = await fetchTrendingWithPhoton(context);
              setCachedPlaces(cacheKey, fallbackResults, TRENDING_CACHE_TTL_MS);
              return fallbackResults;
            }

            let scopedResults = proxyResults;
            if (proxyResults.length > 0) {
              const categoryScoped = proxyResults.filter((place) =>
                preferredCategories.includes(place.category),
              );
              const sourcePool = categoryScoped.length >= 5 ? categoryScoped : proxyResults;

              scopedResults = shuffleArray(
                sourcePool
                  .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                  .slice(0, 12),
              ).slice(0, 6);
            }

            setCachedPlaces(cacheKey, scopedResults, TRENDING_CACHE_TTL_MS);
            return scopedResults;
          } catch (error) {
            console.warn('Places proxy trending lookup failed, using fallback provider.', error);
          }
        }

        const fallbackResults = await fetchTrendingWithPhoton(context);
        setCachedPlaces(cacheKey, fallbackResults, TRENDING_CACHE_TTL_MS);
        return fallbackResults;
      })();

      return setInFlightPlacesRequest(cacheKey, networkRequest);
    },
    enabled: isEnabled,
    staleTime: TRENDING_CACHE_TTL_MS,
    gcTime: TRENDING_CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });
}
