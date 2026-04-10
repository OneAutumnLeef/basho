import { Place } from "@/types/places";

type PlacesEndpoint = "search" | "trending";

interface PlacesQuotaBucket {
  date: string;
  search: number;
  trending: number;
}

interface CachedEntry {
  expiresAt: number;
  savedAt: number;
  value: Place[];
}

type CacheStore = Record<string, CachedEntry>;

const QUOTA_STORAGE_KEY = "basho-places-quota-v1";
const CACHE_STORAGE_KEY = "basho-places-cache-v1";
const CACHE_KEY_VERSION = "v3";

const DEFAULT_SEARCH_DAILY_LIMIT = Number(import.meta.env.VITE_PLACES_SEARCH_DAILY_LIMIT ?? 120);
const DEFAULT_TRENDING_DAILY_LIMIT = Number(import.meta.env.VITE_PLACES_TRENDING_DAILY_LIMIT ?? 24);
const DEFAULT_SEARCH_COOLDOWN_MS = Number(import.meta.env.VITE_PLACES_SEARCH_COOLDOWN_MS ?? 2500);
const DEFAULT_TRENDING_COOLDOWN_MS = Number(import.meta.env.VITE_PLACES_TRENDING_COOLDOWN_MS ?? 300000);
const DEFAULT_MAX_CACHE_ENTRIES = Number(import.meta.env.VITE_PLACES_CACHE_MAX_ENTRIES ?? 180);

const warnedMessages = new Set<string>();
const inFlightRequests = new Map<string, Promise<Place[]>>();

const lastNetworkAt: Record<PlacesEndpoint, number> = {
  search: 0,
  trending: 0,
};

function logOnce(message: string): void {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(storageKey: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(storageKey: string, payload: T): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Storage saturation should not break discovery flows.
  }
}

function readQuotaBucket(): PlacesQuotaBucket {
  const fallback: PlacesQuotaBucket = {
    date: todayIsoDate(),
    search: 0,
    trending: 0,
  };

  const bucket = readJson<PlacesQuotaBucket>(QUOTA_STORAGE_KEY, fallback);
  if (bucket.date !== fallback.date) {
    return fallback;
  }

  return bucket;
}

function writeQuotaBucket(bucket: PlacesQuotaBucket): void {
  writeJson(QUOTA_STORAGE_KEY, bucket);
}

function getDailyLimit(endpoint: PlacesEndpoint): number {
  return endpoint === "search" ? DEFAULT_SEARCH_DAILY_LIMIT : DEFAULT_TRENDING_DAILY_LIMIT;
}

function getCooldownMs(endpoint: PlacesEndpoint): number {
  return endpoint === "search" ? DEFAULT_SEARCH_COOLDOWN_MS : DEFAULT_TRENDING_COOLDOWN_MS;
}

function readCacheStore(): CacheStore {
  return readJson<CacheStore>(CACHE_STORAGE_KEY, {});
}

function writeCacheStore(store: CacheStore): void {
  writeJson(CACHE_STORAGE_KEY, store);
}

function trimCacheStore(store: CacheStore): CacheStore {
  const entries = Object.entries(store)
    .filter(([, value]) => value.expiresAt > Date.now())
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, DEFAULT_MAX_CACHE_ENTRIES);

  return entries.reduce<CacheStore>((acc, [key, entry]) => {
    acc[key] = entry;
    return acc;
  }, {});
}

export function normalizePlacesQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildPlacesCacheKey(endpoint: PlacesEndpoint, keyParts: string[]): string {
  return [CACHE_KEY_VERSION, endpoint, ...keyParts.map((part) => normalizePlacesQuery(part))].join("|");
}

export function getCachedPlaces(cacheKey: string): Place[] | null {
  const store = readCacheStore();
  const entry = store[cacheKey];
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    delete store[cacheKey];
    writeCacheStore(store);
    return null;
  }

  return entry.value;
}

export function setCachedPlaces(cacheKey: string, value: Place[], ttlMs: number): void {
  const store = readCacheStore();
  store[cacheKey] = {
    value,
    savedAt: Date.now(),
    expiresAt: Date.now() + Math.max(1, ttlMs),
  };

  writeCacheStore(trimCacheStore(store));
}

export function shouldThrottlePlaces(endpoint: PlacesEndpoint): boolean {
  const cooldown = getCooldownMs(endpoint);
  return Date.now() - lastNetworkAt[endpoint] < cooldown;
}

export function markPlacesNetworkRequest(endpoint: PlacesEndpoint): void {
  lastNetworkAt[endpoint] = Date.now();
}

export function canUseGooglePlaces(endpoint: PlacesEndpoint): boolean {
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return false;

  if (String(import.meta.env.VITE_DISABLE_LIVE_PLACES || "").toLowerCase() === "true") {
    logOnce("[Places] Live Google Places requests disabled by VITE_DISABLE_LIVE_PLACES.");
    return false;
  }

  const bucket = readQuotaBucket();
  const consumed = endpoint === "search" ? bucket.search : bucket.trending;
  const limit = getDailyLimit(endpoint);

  if (consumed >= limit) {
    logOnce(`[Places] Daily ${endpoint} request cap reached (${consumed}/${limit}); switching to fallback source.`);
    return false;
  }

  return true;
}

export function consumeGooglePlacesBudget(endpoint: PlacesEndpoint): void {
  const bucket = readQuotaBucket();

  if (endpoint === "search") {
    bucket.search += 1;
  } else {
    bucket.trending += 1;
  }

  writeQuotaBucket(bucket);
}

export function getInFlightPlacesRequest(cacheKey: string): Promise<Place[]> | null {
  return inFlightRequests.get(cacheKey) || null;
}

export function setInFlightPlacesRequest(cacheKey: string, request: Promise<Place[]>): Promise<Place[]> {
  inFlightRequests.set(cacheKey, request);
  request.finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  return request;
}
