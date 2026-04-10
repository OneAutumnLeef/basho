import { useQuery } from '@tanstack/react-query';
import {
  DiscoveryContext,
  DiscoveryTimeWindow,
  Place,
  PlaceCategory,
} from '@/types/places';
import {
  buildPlacesCacheKey,
  getCachedPlaces,
  getInFlightPlacesRequest,
  markPlacesNetworkRequest,
  normalizePlacesQuery,
  setCachedPlaces,
  setInFlightPlacesRequest,
  shouldThrottlePlaces,
} from '@/lib/places-traffic-control';
import { canUsePlacesProxy, fetchPlacesFromProxy } from '@/lib/places-proxy-client';

const MIN_SEARCH_QUERY_LENGTH = 4;
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const DEFAULT_DISCOVERY_CONTEXT: DiscoveryContext = {
  city: 'Bangalore',
  vibe: 'Night Out',
  timeWindow: 'evening',
};

const TIME_WINDOW_HINTS: Record<DiscoveryTimeWindow, string> = {
  morning: 'breakfast-friendly',
  afternoon: 'afternoon-friendly',
  evening: 'evening-friendly',
  'late-night': 'late-night friendly',
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

function buildSearchQuery(query: string, context: DiscoveryContext): string {
  return `${query} ${TIME_WINDOW_HINTS[context.timeWindow]} in ${context.city}`.trim();
}

function normalizeVibeTag(vibe: string): string {
  return vibe.trim().toLowerCase().replace(/\s+/g, '-');
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

async function searchWithPhoton(query: string, context: DiscoveryContext): Promise<Place[]> {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(buildSearchQuery(query, context))}&limit=10`,
  );
  if (!response.ok) throw new Error('Photon search failed');

  const data = await response.json();

  const mapped = data.features.map((feature: any) => {
    const props = feature.properties;
    const addressParts = [props.street, props.city, props.state, props.country].filter(Boolean);
    const address = addressParts.join(', ') || 'Unknown Address';

    let category: PlaceCategory = 'other';
    const osmValue = props.osm_value?.toLowerCase() || '';

    if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(osmValue)) category = 'dining';
    else if (['hotel', 'hostel', 'motel', 'guest_house'].includes(osmValue)) category = 'accommodation';
    else if (['museum', 'gallery', 'memorial', 'monument', 'ruins', 'historic'].includes(osmValue) || props.osm_key === 'historic') category = 'historic';
    else if (['park', 'forest', 'beach', 'nature_reserve'].includes(osmValue)) category = 'nature';
    else if (['attraction', 'theme_park', 'zoo', 'viewpoint'].includes(osmValue)) category = 'attraction';
    else if (['station', 'airport', 'subway', 'bus_stop'].includes(osmValue)) category = 'transport';

    return {
      id: `search-${props.osm_id || Math.random()}`,
      originalId: props.osm_id?.toString(),
      name: props.name || 'Unknown Place',
      address,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      category,
      rating: undefined,
      tags: [normalizeVibeTag(context.vibe), context.timeWindow],
      createdAt: new Date().toISOString(),
    };
  });

  return filterPlacesByCity(mapped, context.city);
}

export function usePlaceSearch(
  query: string,
  contextOverrides?: Partial<DiscoveryContext>,
) {
  const context = normalizeDiscoveryContext(contextOverrides);
  const normalizedQuery = normalizePlacesQuery(query);
  const cacheKey = buildPlacesCacheKey('search', [
    normalizedQuery,
    context.city,
    context.vibe,
    context.timeWindow,
  ]);

  return useQuery({
    queryKey: ['placeSearch', normalizedQuery, context.city, context.vibe, context.timeWindow],
    queryFn: async (): Promise<Place[]> => {
      if (!normalizedQuery || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) return [];

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
          !shouldThrottlePlaces('search', cacheKey);

        if (shouldUseProxy) {
          try {
            markPlacesNetworkRequest('search', cacheKey);

            const proxyResults = await fetchPlacesFromProxy({
              endpoint: 'search',
              query: normalizedQuery,
              context,
            });

            if (proxyResults.length === 0) {
              const fallbackResults = await searchWithPhoton(normalizedQuery, context);
              setCachedPlaces(cacheKey, fallbackResults, SEARCH_CACHE_TTL_MS);
              return fallbackResults;
            }

            setCachedPlaces(cacheKey, proxyResults, SEARCH_CACHE_TTL_MS);
            return proxyResults;
          } catch (error) {
            console.warn('Places proxy search failed, using fallback provider.', error);
          }
        }

        const fallbackResults = await searchWithPhoton(normalizedQuery, context);
        setCachedPlaces(cacheKey, fallbackResults, SEARCH_CACHE_TTL_MS);
        return fallbackResults;
      })();

      return setInFlightPlacesRequest(cacheKey, networkRequest);
    },
    enabled: normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH,
    staleTime: SEARCH_CACHE_TTL_MS,
    gcTime: SEARCH_CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });
}
