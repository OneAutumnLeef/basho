import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type ProxyEndpoint = "search" | "trending";
type DiscoveryTimeWindow = "morning" | "afternoon" | "evening" | "late-night";
type PlaceCategory =
  | "accommodation"
  | "dining"
  | "attraction"
  | "transport"
  | "cafe"
  | "nature"
  | "historic"
  | "other";

interface DiscoveryContext {
  city: string;
  vibe: string;
  timeWindow: DiscoveryTimeWindow;
}

interface ProxyRequestBody {
  endpoint: ProxyEndpoint;
  query?: string;
  context?: Partial<DiscoveryContext>;
}

interface Place {
  id: string;
  originalId?: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  tags: string[];
  rating?: number;
  imageUrl?: string;
  mediaLinks?: string[];
  createdAt: string;
  category: PlaceCategory;
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  types?: string[];
  photos?: Array<{ name?: string }>;
}

interface GoogleSearchResponse {
  places?: GooglePlace[];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_CONTEXT: DiscoveryContext = {
  city: "Bangalore",
  vibe: "Night Out",
  timeWindow: "evening",
};

const TIME_WINDOW_HINTS: Record<DiscoveryTimeWindow, string> = {
  morning: "breakfast-friendly",
  afternoon: "afternoon-friendly",
  evening: "evening-friendly",
  "late-night": "late-night friendly",
};

const TRENDING_TIME_HINTS: Record<DiscoveryTimeWindow, string> = {
  morning: "morning plan",
  afternoon: "afternoon hangout",
  evening: "evening outing",
  "late-night": "late night spots",
};

const VIBE_QUERY_HINTS: Record<string, string> = {
  "night out": "restobars and lounges",
  "coffee crawl": "cafes and bakeries",
  "culture walk": "museums and landmarks",
  "nature reset": "parks and scenic viewpoints",
  "food crawl": "local food hotspots",
  romantic: "romantic dining and views",
};

const VIBE_CATEGORY_MAP: Record<string, PlaceCategory[]> = {
  "night out": ["dining", "cafe", "attraction"],
  "coffee crawl": ["cafe", "dining"],
  "culture walk": ["historic", "attraction"],
  "nature reset": ["nature", "attraction"],
  "food crawl": ["dining", "cafe"],
  romantic: ["dining", "historic", "attraction"],
};

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ["bengaluru"],
  bengaluru: ["bangalore"],
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.types",
  "places.photos.name",
].join(",");

const GLOBAL_RATE_LIMIT_KEY = "__global__";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeVibeTag(vibe: string): string {
  return normalizeText(vibe).replace(/\s+/g, "-");
}

function normalizeDiscoveryContext(context?: Partial<DiscoveryContext>): DiscoveryContext {
  const timeWindow = context?.timeWindow;
  const hasValidWindow = timeWindow === "morning" ||
    timeWindow === "afternoon" ||
    timeWindow === "evening" ||
    timeWindow === "late-night";

  return {
    city: context?.city?.trim() || DEFAULT_CONTEXT.city,
    vibe: context?.vibe?.trim() || DEFAULT_CONTEXT.vibe,
    timeWindow: hasValidWindow ? timeWindow : DEFAULT_CONTEXT.timeWindow,
  };
}

function buildSearchQuery(query: string, context: DiscoveryContext): string {
  return `${query} ${TIME_WINDOW_HINTS[context.timeWindow]} in ${context.city}`.trim();
}

function buildTrendingQuery(context: DiscoveryContext): string {
  const vibeKey = normalizeText(context.vibe);
  const vibeHint = VIBE_QUERY_HINTS[vibeKey] || "popular places";
  const timeHint = TRENDING_TIME_HINTS[context.timeWindow];
  return `Top rated ${vibeHint} for ${timeHint} in ${context.city}`;
}

function buildServerCacheKey(endpoint: ProxyEndpoint, query: string, context: DiscoveryContext): string {
  if (endpoint === "search") {
    return [
      "proxy-v2",
      endpoint,
      normalizeText(query),
      normalizeText(context.city),
      normalizeText(context.vibe),
      context.timeWindow,
    ].join("|");
  }

  return [
    "proxy-v2",
    endpoint,
    normalizeText(context.city),
    normalizeText(context.vibe),
    context.timeWindow,
  ].join("|");
}

function normalizeAddressToken(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function buildCityTokens(city: string): string[] {
  const normalizedCity = normalizeText(city);
  const aliases = CITY_ALIASES[normalizedCity] || [];
  const tokens = [normalizedCity, ...aliases]
    .map((token) => normalizeAddressToken(token))
    .filter((token) => token.length > 2);

  return Array.from(new Set(tokens));
}

function filterPlacesByCity(places: Place[], city: string): Place[] {
  const cityTokens = buildCityTokens(city);
  if (cityTokens.length === 0) return places;

  return places.filter((place) => {
    const normalizedAddress = normalizeAddressToken(place.address || "");
    return cityTokens.some((token) => normalizedAddress.includes(token));
  });
}

function mapGoogleTypeToCategory(types: string[]): PlaceCategory {
  if (types.length === 0) return "other";

  const typeMap: Record<string, PlaceCategory> = {
    restaurant: "dining",
    cafe: "cafe",
    bar: "dining",
    lodging: "accommodation",
    hotel: "accommodation",
    museum: "historic",
    park: "nature",
    tourist_attraction: "attraction",
    airport: "transport",
    train_station: "transport",
    transit_station: "transport",
  };

  for (const type of types) {
    if (typeMap[type]) return typeMap[type];
  }

  return "other";
}

function shuffleArray<T>(array: T[]): T[] {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getServerTtlSeconds(endpoint: ProxyEndpoint): number {
  const searchTtl = Number(Deno.env.get("PLACES_PROXY_SEARCH_TTL_SECONDS") ?? 60 * 60 * 24);
  const trendingTtl = Number(Deno.env.get("PLACES_PROXY_TRENDING_TTL_SECONDS") ?? 60 * 60 * 12);
  return endpoint === "search" ? searchTtl : trendingTtl;
}

function getClientDailyLimit(endpoint: ProxyEndpoint): number {
  const searchLimit = Number(Deno.env.get("PLACES_PROXY_SEARCH_DAILY_CLIENT_LIMIT") ?? 80);
  const trendingLimit = Number(Deno.env.get("PLACES_PROXY_TRENDING_DAILY_CLIENT_LIMIT") ?? 20);
  return endpoint === "search" ? searchLimit : trendingLimit;
}

function getGlobalDailyLimit(endpoint: ProxyEndpoint): number {
  const searchLimit = Number(Deno.env.get("PLACES_PROXY_SEARCH_DAILY_GLOBAL_LIMIT") ?? 700);
  const trendingLimit = Number(Deno.env.get("PLACES_PROXY_TRENDING_DAILY_GLOBAL_LIMIT") ?? 200);
  return endpoint === "search" ? searchLimit : trendingLimit;
}

function buildPhotoUrl(photoName: string | undefined): string | undefined {
  if (!photoName) return undefined;
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=560`;
}

function sanitizeGoogleMediaUrl(
  rawUrl: string | undefined,
): { url?: string; photoRef?: string } {
  if (!rawUrl) return {};

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== "places.googleapis.com") {
      return { url: rawUrl };
    }

    parsed.searchParams.delete("key");
    const normalizedPath = parsed.pathname
      .replace(/^\/v1\//, "")
      .replace(/^\//, "");

    return {
      url: parsed.toString(),
      photoRef: normalizedPath.startsWith("places/") ? normalizedPath : undefined,
    };
  } catch {
    return { url: rawUrl };
  }
}

function sanitizePlacesForResponse(places: Place[]): Place[] {
  return places.map((place) => {
    const sanitized = sanitizeGoogleMediaUrl(place.imageUrl);
    const mediaLinks = place.mediaLinks && place.mediaLinks.length > 0
      ? place.mediaLinks
      : (sanitized.photoRef ? [sanitized.photoRef] : undefined);

    return {
      ...place,
      imageUrl: sanitized.url,
      mediaLinks,
    };
  });
}

function mapGoogleResultsToPlaces(
  endpoint: ProxyEndpoint,
  googlePlaces: GooglePlace[],
  context: DiscoveryContext,
): Place[] {
  const createdAt = new Date().toISOString();
  const vibeTag = normalizeVibeTag(context.vibe);

  const mapped = googlePlaces.map((item) => {
    const placeId = item.id ?? crypto.randomUUID();
    return {
      id: `google-${placeId}`,
      originalId: item.id,
      name: item.displayName?.text?.trim() || "Unknown Place",
      address: item.formattedAddress || "Unknown Address",
      lat: item.location?.latitude ?? 0,
      lng: item.location?.longitude ?? 0,
      category: mapGoogleTypeToCategory(item.types ?? []),
      rating: typeof item.rating === "number" ? item.rating : undefined,
      imageUrl: buildPhotoUrl(item.photos?.[0]?.name),
      mediaLinks: item.photos?.[0]?.name ? [item.photos[0].name] : undefined,
      tags: endpoint === "trending"
        ? ["trending", vibeTag, context.timeWindow]
        : [vibeTag, context.timeWindow],
      createdAt,
    } satisfies Place;
  });

  const cityScoped = filterPlacesByCity(mapped, context.city);

  if (endpoint !== "trending") {
    return cityScoped.slice(0, 10);
  }

  const preferredCategories = VIBE_CATEGORY_MAP[normalizeText(context.vibe)] || [
    "dining",
    "cafe",
    "attraction",
  ];

  const categoryScoped = cityScoped.filter((place) => preferredCategories.includes(place.category));
  const sourcePool = categoryScoped.length >= 5 ? categoryScoped : cityScoped;

  return shuffleArray(
    sourcePool
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 12),
  ).slice(0, 6);
}

async function hashClientFingerprint(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extractJwtSubject(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

async function resolveClientKey(req: Request): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const directIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent") || "unknown";
  const authHeader = req.headers.get("authorization");
  const authSubject = extractJwtSubject(authHeader);

  if (authSubject) {
    return `user-${authSubject}`;
  }

  const rawFingerprint = `${forwarded || directIp || "unknown-ip"}|${userAgent}`;
  const digest = await hashClientFingerprint(rawFingerprint);
  return `client-${digest.slice(0, 24)}`;
}

async function fetchGooglePlaces(apiKey: string, query: string, maxResults: number): Promise<GooglePlace[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: maxResults,
      languageCode: "en",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Places API error (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as GoogleSearchResponse;
  return payload.places ?? [];
}

async function bumpRateCounter(
  supabase: ReturnType<typeof createClient>,
  endpoint: ProxyEndpoint,
  clientKey: string,
): Promise<number> {
  const dayKey = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc("bump_places_rate_limit", {
    p_day_key: dayKey,
    p_endpoint: endpoint,
    p_client_key: clientKey,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

async function logProxyRequest(
  supabase: ReturnType<typeof createClient>,
  payload: {
    endpoint: ProxyEndpoint;
    cacheKey: string;
    clientKey: string;
    status: string;
    provider?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const { endpoint, cacheKey, clientKey, status, provider, details } = payload;

  const { error } = await supabase.from("places_api_request_logs").insert({
    endpoint,
    cache_key: cacheKey,
    client_key: clientKey,
    status,
    provider,
    details: details ?? {},
  });

  if (error) {
    console.warn("[places-proxy] log write failed", error.message);
  }
}

async function getFreshCache(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
): Promise<Place[] | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("places_api_cache")
    .select("response_json, hit_count")
    .eq("cache_key", cacheKey)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.response_json || typeof data.response_json !== "object") {
    return null;
  }

  const responseJson = data.response_json as { places?: Place[] };
  if (!Array.isArray(responseJson.places)) {
    return null;
  }

  // Best-effort hit counter; request should still succeed if this update fails.
  await supabase
    .from("places_api_cache")
    .update({
      hit_count: Number(data.hit_count ?? 0) + 1,
      updated_at: nowIso,
    })
    .eq("cache_key", cacheKey);

  return sanitizePlacesForResponse(responseJson.places);
}

async function getStaleCache(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
): Promise<Place[] | null> {
  const { data, error } = await supabase
    .from("places_api_cache")
    .select("response_json")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.response_json || typeof data.response_json !== "object") {
    return null;
  }

  const responseJson = data.response_json as { places?: Place[] };
  if (!Array.isArray(responseJson.places)) {
    return null;
  }

  return sanitizePlacesForResponse(responseJson.places);
}

async function writeCache(
  supabase: ReturnType<typeof createClient>,
  payload: {
    cacheKey: string;
    endpoint: ProxyEndpoint;
    places: Place[];
    provider: string;
    ttlSeconds: number;
  },
): Promise<void> {
  const now = Date.now();
  const { cacheKey, endpoint, places, provider, ttlSeconds } = payload;

  const { error } = await supabase.from("places_api_cache").upsert({
    cache_key: cacheKey,
    endpoint,
    response_json: {
      places,
      generated_at: new Date(now).toISOString(),
    },
    provider,
    expires_at: new Date(now + Math.max(1, ttlSeconds) * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  });

  if (error) {
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_SERVER_API_KEY") ||
    Deno.env.get("GOOGLE_MAPS_SERVER_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server missing Supabase credentials" }, 500);
  }

  if (!googleApiKey) {
    return jsonResponse({ error: "Server missing Google Places API key" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: ProxyRequestBody;
  try {
    body = (await req.json()) as ProxyRequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (body.endpoint !== "search" && body.endpoint !== "trending") {
    return jsonResponse({ error: "Invalid endpoint" }, 400);
  }

  const endpoint = body.endpoint;
  const context = normalizeDiscoveryContext(body.context);
  const query = endpoint === "search" ? normalizeText(body.query || "") : "";

  if (endpoint === "search" && query.length < 4) {
    return jsonResponse({ data: [], source: "empty-query" });
  }

  const cacheKey = buildServerCacheKey(endpoint, query, context);
  const clientKey = await resolveClientKey(req);

  try {
    const freshCache = await getFreshCache(supabase, cacheKey);
    if (freshCache) {
      await logProxyRequest(supabase, {
        endpoint,
        cacheKey,
        clientKey,
        status: "cache_hit",
        provider: "cache",
      });
      return jsonResponse({
        data: freshCache,
        source: "cache",
        cacheKey,
      });
    }

    const clientCount = await bumpRateCounter(supabase, endpoint, clientKey);
    const globalCount = await bumpRateCounter(supabase, endpoint, GLOBAL_RATE_LIMIT_KEY);

    const clientLimit = getClientDailyLimit(endpoint);
    const globalLimit = getGlobalDailyLimit(endpoint);

    if (clientCount > clientLimit || globalCount > globalLimit) {
      const staleCache = await getStaleCache(supabase, cacheKey);

      await logProxyRequest(supabase, {
        endpoint,
        cacheKey,
        clientKey,
        status: staleCache ? "rate_limited_stale_cache" : "rate_limited",
        provider: staleCache ? "stale-cache" : "none",
        details: {
          clientCount,
          clientLimit,
          globalCount,
          globalLimit,
        },
      });

      if (staleCache) {
        return jsonResponse({
          data: staleCache,
          source: "stale-cache",
          cacheKey,
          rateLimit: {
            clientCount,
            clientLimit,
            globalCount,
            globalLimit,
          },
        });
      }

      return jsonResponse({
        error: "Daily Places request limit reached",
        rateLimit: {
          clientCount,
          clientLimit,
          globalCount,
          globalLimit,
        },
      }, 429);
    }

    const upstreamQuery = endpoint === "search"
      ? buildSearchQuery(query, context)
      : buildTrendingQuery(context);
    const maxResultCount = endpoint === "search" ? 10 : 15;

    const googleResults = await fetchGooglePlaces(googleApiKey, upstreamQuery, maxResultCount);
    const mappedPlaces = mapGoogleResultsToPlaces(endpoint, googleResults, context);

    await writeCache(supabase, {
      cacheKey,
      endpoint,
      places: mappedPlaces,
      provider: "google",
      ttlSeconds: getServerTtlSeconds(endpoint),
    });

    await logProxyRequest(supabase, {
      endpoint,
      cacheKey,
      clientKey,
      status: "upstream_success",
      provider: "google",
      details: {
        resultCount: mappedPlaces.length,
        clientCount,
        globalCount,
      },
    });

    return jsonResponse({
      data: mappedPlaces,
      source: "google",
      cacheKey,
      rateLimit: {
        clientCount,
        clientLimit,
        globalCount,
        globalLimit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";

    try {
      await logProxyRequest(supabase, {
        endpoint,
        cacheKey,
        clientKey,
        status: "upstream_error",
        provider: "google",
        details: {
          message,
        },
      });
    } catch {
      // Logging failures should never hide the underlying failure.
    }

    console.error("[places-proxy] request failed", message);
    return jsonResponse({ error: "Places proxy request failed", details: message }, 502);
  }
});
