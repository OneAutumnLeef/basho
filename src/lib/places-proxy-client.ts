import { supabase } from '@/integrations/supabase/client';
import { DiscoveryContext, Place } from '@/types/places';

type PlacesProxyEndpoint = 'search' | 'trending';
const CLIENT_GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface PlacesProxyRequest {
  endpoint: PlacesProxyEndpoint;
  query?: string;
  context: DiscoveryContext;
}

interface PlacesProxyResponse {
  data?: Place[];
  error?: string;
  details?: string;
}

function extractGooglePhotoPath(
  raw: string | undefined,
): { path: string; maxHeightPx: string } | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('places/')) {
    return { path: trimmed, maxHeightPx: '560' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname !== 'places.googleapis.com') return null;

    const normalizedPath = parsed.pathname
      .replace(/^\/v1\//, '')
      .replace(/^\//, '');

    if (!normalizedPath.startsWith('places/')) return null;

    return {
      path: normalizedPath,
      maxHeightPx: parsed.searchParams.get('maxHeightPx') || '560',
    };
  } catch {
    return null;
  }
}

function buildGoogleMediaUrl(path: string, maxHeightPx: string): string {
  return `https://places.googleapis.com/v1/${path}/media?maxHeightPx=${encodeURIComponent(maxHeightPx)}&key=${encodeURIComponent(CLIENT_GOOGLE_MAPS_KEY)}`;
}

function resolvePlaceImageUrl(place: Place): string | undefined {
  const mediaPhotoPath = extractGooglePhotoPath(place.mediaLinks?.[0]);
  if (mediaPhotoPath) {
    return CLIENT_GOOGLE_MAPS_KEY
      ? buildGoogleMediaUrl(mediaPhotoPath.path, mediaPhotoPath.maxHeightPx)
      : undefined;
  }

  const imagePhotoPath = extractGooglePhotoPath(place.imageUrl);
  if (imagePhotoPath) {
    return CLIENT_GOOGLE_MAPS_KEY
      ? buildGoogleMediaUrl(imagePhotoPath.path, imagePhotoPath.maxHeightPx)
      : undefined;
  }

  return place.imageUrl;
}

function sanitizeProxyPlaces(places: Place[]): Place[] {
  return places.map((place) => ({
    ...place,
    imageUrl: resolvePlaceImageUrl(place),
  }));
}

export function canUsePlacesProxy(): boolean {
  if (String(import.meta.env.VITE_DISABLE_PLACES_PROXY || '').toLowerCase() === 'true') {
    return false;
  }

  return Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export async function fetchPlacesFromProxy(request: PlacesProxyRequest): Promise<Place[]> {
  const { data, error } = await supabase.functions.invoke<PlacesProxyResponse>('places-proxy', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Places proxy request failed');
  }

  if (!data) {
    throw new Error('Places proxy returned an empty response');
  }

  if (data.error) {
    throw new Error(data.details ? `${data.error}: ${data.details}` : data.error);
  }

  return Array.isArray(data.data) ? sanitizeProxyPlaces(data.data) : [];
}
