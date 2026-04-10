import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Place, PlannerSettings, RouteMode, TripBucketItem } from "@/types/places";
import {
  RestoreTripVersionInput,
  SaveTripInput,
  SaveTripResult,
  SavedTripData,
  SavedTripSummary,
  SuggestionAuditInput,
  TripVersionSummary,
} from "@/types/trips";

const LOCAL_TRIPS_KEY = "basho-local-trips-v1";
const LOCAL_SUGGESTION_AUDIT_KEY = "basho-local-suggestion-audit-v1";
const LOCAL_TRIP_VERSIONS_KEY = "basho-local-trip-versions-v1";
const MAX_TRIP_VERSIONS_PER_TRIP = 20;

const EMPTY_SETTINGS: PlannerSettings = {
  city: "Bangalore",
  vibe: "Night Out",
  startTime: "18:30",
  timeWindow: "evening",
  pace: "balanced",
};

interface StoredLocalTrip {
  id: string;
  name: string;
  city: string;
  vibe: string;
  startTime: string;
  timeWindow: PlannerSettings["timeWindow"];
  pace: PlannerSettings["pace"];
  routeMode: RouteMode;
  planScore: number;
  items: TripBucketItem[];
  createdAt: string;
  updatedAt: string;
}

interface TripRow {
  id: string;
  name: string;
  city: string;
  vibe: string;
  start_time: string;
  time_window: PlannerSettings["timeWindow"];
  pace: PlannerSettings["pace"];
  route_mode: RouteMode;
  plan_score: number;
  created_at: string;
  updated_at: string;
}

interface TripItemRow {
  id: string;
  trip_id: string;
  order_index: number;
  dwell_minutes: number | null;
  external_place_id: string | null;
  place_name: string;
  place_address: string;
  place_lat: number;
  place_lng: number;
  place_category: Place["category"] | null;
  place_image_url: string | null;
  place_rating: number | null;
}

interface TripVersionSnapshot {
  name: string;
  settings: PlannerSettings;
  routeMode: RouteMode;
  planScore: number;
  items: TripBucketItem[];
  updatedAt: string;
}

interface LocalTripVersionRecord {
  id: string;
  tripId: string;
  createdAt: string;
  label: string;
  snapshot: TripVersionSnapshot;
}

type LocalTripVersionsStore = Record<string, LocalTripVersionRecord[]>;

interface TripVersionRow {
  id: string;
  trip_id: string;
  label: string | null;
  created_at: string;
  snapshot_json: unknown;
}

export class TripSaveConflictError extends Error {
  tripId: string;
  latestUpdatedAt: string | null;

  constructor(tripId: string, latestUpdatedAt: string | null) {
    super("Trip was updated in another session. Reload the latest version and retry.");
    this.name = "TripSaveConflictError";
    this.tripId = tripId;
    this.latestUpdatedAt = latestUpdatedAt;
  }
}

function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function safeReadLocalTrips(): StoredLocalTrip[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredLocalTrip[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLocalTrips(trips: StoredLocalTrip[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(trips));
}

function appendLocalSuggestionAudit(entry: SuggestionAuditInput): void {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(LOCAL_SUGGESTION_AUDIT_KEY);
    const current = raw ? (JSON.parse(raw) as Array<SuggestionAuditInput & { createdAt: string }>) : [];
    current.unshift({ ...entry, createdAt: new Date().toISOString() });
    window.localStorage.setItem(LOCAL_SUGGESTION_AUDIT_KEY, JSON.stringify(current.slice(0, 500)));
  } catch {
    // Best-effort local telemetry; ignore storage serialization errors.
  }
}

function safeReadLocalTripVersions(): LocalTripVersionsStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LOCAL_TRIP_VERSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalTripVersionsStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteLocalTripVersions(store: LocalTripVersionsStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TRIP_VERSIONS_KEY, JSON.stringify(store));
}

function cloneTripItems(items: TripBucketItem[]): TripBucketItem[] {
  return items.map((item) => ({
    ...item,
    place: {
      ...item.place,
      tags: [...(item.place.tags || [])],
    },
  }));
}

function buildTripVersionSnapshot(input: SaveTripInput, updatedAt: string): TripVersionSnapshot {
  return {
    name: input.name,
    settings: {
      ...input.settings,
    },
    routeMode: input.routeMode,
    planScore: input.planScore,
    items: cloneTripItems(input.items),
    updatedAt,
  };
}

function mapLocalVersionToSummary(version: LocalTripVersionRecord): TripVersionSummary {
  return {
    id: version.id,
    tripId: version.tripId,
    createdAt: version.createdAt,
    label: version.label,
    source: "local",
  };
}

function appendLocalTripVersion(tripId: string, input: SaveTripInput, updatedAt: string): void {
  const store = safeReadLocalTripVersions();
  const existing = store[tripId] || [];
  const createdAt = new Date().toISOString();

  const nextVersion: LocalTripVersionRecord = {
    id: `local-version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tripId,
    createdAt,
    label: `Saved ${new Date(createdAt).toLocaleString()}`,
    snapshot: buildTripVersionSnapshot(input, updatedAt),
  };

  store[tripId] = [nextVersion, ...existing].slice(0, MAX_TRIP_VERSIONS_PER_TRIP);
  safeWriteLocalTripVersions(store);
}

function getLocalTripVersionSummaries(tripId: string): TripVersionSummary[] {
  const store = safeReadLocalTripVersions();
  const versions = store[tripId] || [];
  return versions.map(mapLocalVersionToSummary);
}

function getLocalTripVersionSnapshot(
  tripId: string,
  versionId: string,
): TripVersionSnapshot | null {
  const store = safeReadLocalTripVersions();
  const version = (store[tripId] || []).find((entry) => entry.id === versionId);
  return version?.snapshot || null;
}

function parseTripVersionSnapshot(raw: unknown): TripVersionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<TripVersionSnapshot>;
  if (!candidate.name || typeof candidate.name !== "string") return null;
  if (!candidate.settings || typeof candidate.settings !== "object") return null;
  if (candidate.routeMode !== "fixed" && candidate.routeMode !== "optimize") return null;
  if (typeof candidate.planScore !== "number") return null;
  if (!Array.isArray(candidate.items)) return null;

  return {
    name: candidate.name,
    settings: {
      city: candidate.settings.city || EMPTY_SETTINGS.city,
      vibe: candidate.settings.vibe || EMPTY_SETTINGS.vibe,
      startTime: candidate.settings.startTime || EMPTY_SETTINGS.startTime,
      timeWindow: candidate.settings.timeWindow || EMPTY_SETTINGS.timeWindow,
      pace: candidate.settings.pace || EMPTY_SETTINGS.pace,
    },
    routeMode: candidate.routeMode,
    planScore: candidate.planScore,
    items: cloneTripItems(candidate.items as TripBucketItem[]),
    updatedAt: typeof candidate.updatedAt === "string"
      ? candidate.updatedAt
      : new Date().toISOString(),
  };
}

function buildSaveInputFromSnapshot(
  tripId: string,
  snapshot: TripVersionSnapshot,
  expectedUpdatedAt?: string | null,
): SaveTripInput {
  return {
    tripId,
    expectedUpdatedAt,
    name: snapshot.name,
    settings: snapshot.settings,
    routeMode: snapshot.routeMode,
    planScore: snapshot.planScore,
    items: cloneTripItems(snapshot.items),
  };
}

function mapStoredToSummary(stored: StoredLocalTrip): SavedTripSummary {
  return {
    id: stored.id,
    name: stored.name,
    city: stored.city,
    vibe: stored.vibe,
    timeWindow: stored.timeWindow,
    itemCount: stored.items.length,
    updatedAt: stored.updatedAt,
    source: "local",
  };
}

function mapStoredToData(stored: StoredLocalTrip): SavedTripData {
  return {
    ...mapStoredToSummary(stored),
    createdAt: stored.createdAt,
    settings: {
      city: stored.city,
      vibe: stored.vibe,
      startTime: stored.startTime,
      timeWindow: stored.timeWindow,
      pace: stored.pace,
    },
    routeMode: stored.routeMode,
    planScore: stored.planScore,
    items: stored.items,
  };
}

function createLocalTripRecord(input: SaveTripInput, tripId?: string): StoredLocalTrip {
  const timestamp = new Date().toISOString();
  const resolvedId = tripId || input.tripId || `local-${Date.now()}`;

  return {
    id: resolvedId,
    name: input.name,
    city: input.settings.city,
    vibe: input.settings.vibe,
    startTime: input.settings.startTime,
    timeWindow: input.settings.timeWindow,
    pace: input.settings.pace,
    routeMode: input.routeMode,
    planScore: input.planScore,
    items: input.items,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function upsertLocalTrip(input: SaveTripInput): SaveTripResult {
  const trips = safeReadLocalTrips();
  const existingIndex = input.tripId
    ? trips.findIndex((trip) => trip.id === input.tripId)
    : -1;

  if (existingIndex >= 0) {
    const updated = {
      ...trips[existingIndex],
      ...createLocalTripRecord(input, trips[existingIndex].id),
      createdAt: trips[existingIndex].createdAt,
      updatedAt: new Date().toISOString(),
    };
    trips.splice(existingIndex, 1, updated);
    safeWriteLocalTrips(trips);
    appendLocalTripVersion(updated.id, input, updated.updatedAt);
    return { id: updated.id, source: "local", updatedAt: updated.updatedAt };
  }

  const created = createLocalTripRecord(input);
  trips.unshift(created);
  safeWriteLocalTrips(trips);
  appendLocalTripVersion(created.id, input, created.updatedAt);
  return { id: created.id, source: "local", updatedAt: created.updatedAt };
}

function loadLocalTrip(tripId: string): SavedTripData | null {
  const trips = safeReadLocalTrips();
  const stored = trips.find((trip) => trip.id === tripId);
  return stored ? mapStoredToData(stored) : null;
}

function mapCloudRowToSummary(row: TripRow, itemCount: number): SavedTripSummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    vibe: row.vibe,
    timeWindow: row.time_window,
    itemCount,
    updatedAt: row.updated_at,
    source: "cloud",
  };
}

function mapTripItemRowToBucketItem(row: TripItemRow, index: number): TripBucketItem {
  const place: Place = {
    id: row.external_place_id || `trip-place-${row.id}`,
    originalId: row.external_place_id || row.id,
    name: row.place_name,
    address: row.place_address,
    lat: row.place_lat,
    lng: row.place_lng,
    category: row.place_category || "other",
    imageUrl: row.place_image_url || undefined,
    rating: row.place_rating || undefined,
    tags: [],
    createdAt: new Date().toISOString(),
  };

  return {
    id: `bucket-${place.id}-${index}`,
    place,
    order: index,
    dwellMinutes: row.dwell_minutes ?? 60,
  };
}

async function appendCloudTripVersion(
  tripId: string,
  input: SaveTripInput,
  updatedAt: string,
): Promise<void> {
  try {
    const snapshot = buildTripVersionSnapshot(input, updatedAt);
    const { error } = await supabase.from("trip_versions").insert({
      trip_id: tripId,
      label: `Saved ${new Date().toLocaleString()}`,
      snapshot_json: snapshot,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    // Version history should not block primary save behavior.
    console.warn("Trip version snapshot write skipped:", error);
  }
}

async function canUseCloudTrips(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

export function useTripPersistence(activeTripId?: string | null) {
  const queryClient = useQueryClient();

  const tripLibraryQuery = useQuery({
    queryKey: ["trip-library"],
    queryFn: async (): Promise<SavedTripSummary[]> => {
      const useCloud = await canUseCloudTrips();

      if (!useCloud) {
        return safeReadLocalTrips().map(mapStoredToSummary);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const { data: trips, error } = await supabase
          .from("trips")
          .select("id,name,city,vibe,start_time,time_window,pace,route_mode,plan_score,created_at,updated_at")
          .eq("owner_user_id", session?.user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (!trips || trips.length === 0) return [];

        const tripIds = trips.map((trip) => trip.id);
        const { data: itemRows, error: itemError } = await supabase
          .from("trip_items")
          .select("trip_id")
          .in("trip_id", tripIds);

        if (itemError) throw itemError;

        const countMap = new Map<string, number>();
        (itemRows || []).forEach((row: { trip_id: string }) => {
          countMap.set(row.trip_id, (countMap.get(row.trip_id) || 0) + 1);
        });

        return (trips as TripRow[]).map((row) =>
          mapCloudRowToSummary(row, countMap.get(row.id) || 0),
        );
      } catch (error) {
        console.warn("Trip library fallback to local storage:", error);
        return safeReadLocalTrips().map(mapStoredToSummary);
      }
    },
  });

  const tripVersionsQuery = useQuery({
    queryKey: ["trip-versions", activeTripId],
    enabled: Boolean(activeTripId),
    queryFn: async (): Promise<TripVersionSummary[]> => {
      if (!activeTripId) return [];

      if (activeTripId.startsWith("local-")) {
        return getLocalTripVersionSummaries(activeTripId);
      }

      const useCloud = await canUseCloudTrips();
      if (!useCloud) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from("trip_versions")
          .select("id,trip_id,label,created_at")
          .eq("trip_id", activeTripId)
          .order("created_at", { ascending: false })
          .limit(MAX_TRIP_VERSIONS_PER_TRIP);

        if (error) throw error;

        return ((data || []) as Array<Omit<TripVersionRow, "snapshot_json">>).map((row) => ({
          id: row.id,
          tripId: row.trip_id,
          createdAt: row.created_at,
          label: row.label || `Saved ${new Date(row.created_at).toLocaleString()}`,
          source: "cloud",
        }));
      } catch (error) {
        console.warn("Trip versions unavailable:", error);
        return [];
      }
    },
  });

  const saveTripMutation = useMutation({
    mutationFn: async (input: SaveTripInput): Promise<SaveTripResult> => {
      const useCloud = await canUseCloudTrips();

      if (!useCloud) {
        return upsertLocalTrip(input);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          return upsertLocalTrip(input);
        }

        let tripId = input.tripId || "";
        let persistedUpdatedAt = new Date().toISOString();

        if (tripId && !tripId.startsWith("local-")) {
          const nextUpdatedAt = new Date().toISOString();
          let updateQuery = supabase
            .from("trips")
            .update({
              name: input.name,
              city: input.settings.city,
              vibe: input.settings.vibe,
              start_time: input.settings.startTime,
              time_window: input.settings.timeWindow,
              pace: input.settings.pace,
              route_mode: input.routeMode,
              plan_score: input.planScore,
              updated_at: nextUpdatedAt,
            })
            .eq("id", tripId)
            .eq("owner_user_id", session.user.id);

          if (input.expectedUpdatedAt) {
            updateQuery = updateQuery.eq("updated_at", input.expectedUpdatedAt);
          }

          const { data: updatedRows, error: updateError } = await updateQuery
            .select("id,updated_at");

          if (updateError) throw updateError;

          if (!updatedRows || updatedRows.length === 0) {
            const { data: latestTrip } = await supabase
              .from("trips")
              .select("updated_at")
              .eq("id", tripId)
              .maybeSingle();

            throw new TripSaveConflictError(tripId, latestTrip?.updated_at ?? null);
          }

          persistedUpdatedAt = (updatedRows[0] as { updated_at: string }).updated_at;
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("trips")
            .insert({
              owner_user_id: session.user.id,
              name: input.name,
              city: input.settings.city,
              vibe: input.settings.vibe,
              start_time: input.settings.startTime,
              time_window: input.settings.timeWindow,
              pace: input.settings.pace,
              route_mode: input.routeMode,
              plan_score: input.planScore,
            })
            .select("id,updated_at")
            .single();

          if (insertError) throw insertError;
          tripId = (inserted as { id: string }).id;
          persistedUpdatedAt = (inserted as { updated_at: string }).updated_at;
        }

        const { error: deleteItemsError } = await supabase
          .from("trip_items")
          .delete()
          .eq("trip_id", tripId);

        if (deleteItemsError) throw deleteItemsError;

        if (input.items.length > 0) {
          const rows = input.items.map((item, index) => ({
            trip_id: tripId,
            order_index: index,
            dwell_minutes: item.dwellMinutes ?? 60,
            external_place_id: item.place.originalId || item.place.id,
            place_name: item.place.name,
            place_address: item.place.address,
            place_lat: item.place.lat,
            place_lng: item.place.lng,
            place_category: item.place.category,
            place_image_url: item.place.imageUrl ?? null,
            place_rating: item.place.rating ?? null,
          }));

          const { error: insertItemsError } = await supabase
            .from("trip_items")
            .insert(rows);

          if (insertItemsError) throw insertItemsError;
        }

        await appendCloudTripVersion(tripId, input, persistedUpdatedAt);

        return { id: tripId, source: "cloud", updatedAt: persistedUpdatedAt };
      } catch (error) {
        if (error instanceof TripSaveConflictError) {
          throw error;
        }

        console.warn("Trip save fallback to local storage:", error);
        return upsertLocalTrip(input);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-library"] });
      queryClient.invalidateQueries({ queryKey: ["trip-versions"] });
    },
  });

  const loadTripMutation = useMutation({
    mutationFn: async (tripId: string): Promise<SavedTripData | null> => {
      if (tripId.startsWith("local-")) {
        return loadLocalTrip(tripId);
      }

      const useCloud = await canUseCloudTrips();
      if (!useCloud) {
        return loadLocalTrip(tripId);
      }

      try {
        const {
          data: trip,
          error: tripError,
        } = await supabase
          .from("trips")
          .select("id,name,city,vibe,start_time,time_window,pace,route_mode,plan_score,created_at,updated_at")
          .eq("id", tripId)
          .single();

        if (tripError || !trip) throw tripError || new Error("Trip not found");

        const { data: itemRows, error: itemError } = await supabase
          .from("trip_items")
          .select("id,trip_id,order_index,dwell_minutes,external_place_id,place_name,place_address,place_lat,place_lng,place_category,place_image_url,place_rating")
          .eq("trip_id", tripId)
          .order("order_index", { ascending: true });

        if (itemError) throw itemError;

        const rows = (itemRows || []) as TripItemRow[];
        const mappedItems = rows.map((row, index) => mapTripItemRowToBucketItem(row, index));
        const row = trip as TripRow;

        return {
          ...mapCloudRowToSummary(row, mappedItems.length),
          createdAt: row.created_at,
          settings: {
            city: row.city || EMPTY_SETTINGS.city,
            vibe: row.vibe || EMPTY_SETTINGS.vibe,
            startTime: row.start_time || EMPTY_SETTINGS.startTime,
            timeWindow: row.time_window || EMPTY_SETTINGS.timeWindow,
            pace: row.pace || EMPTY_SETTINGS.pace,
          },
          routeMode: row.route_mode || "optimize",
          planScore: row.plan_score || 0,
          items: mappedItems,
        };
      } catch (error) {
        console.warn("Trip load fallback to local storage:", error);
        return loadLocalTrip(tripId);
      }
    },
  });

  const restoreTripVersionMutation = useMutation({
    mutationFn: async (input: RestoreTripVersionInput): Promise<SavedTripData | null> => {
      if (input.tripId.startsWith("local-")) {
        const snapshot = getLocalTripVersionSnapshot(input.tripId, input.versionId);
        if (!snapshot) return null;

        const restoredResult = upsertLocalTrip(
          buildSaveInputFromSnapshot(input.tripId, snapshot, input.expectedUpdatedAt),
        );

        return loadLocalTrip(restoredResult.id);
      }

      const useCloud = await canUseCloudTrips();
      if (!useCloud) {
        return null;
      }

      const { data, error } = await supabase
        .from("trip_versions")
        .select("snapshot_json")
        .eq("id", input.versionId)
        .eq("trip_id", input.tripId)
        .single();

      if (error) {
        throw error;
      }

      const snapshot = parseTripVersionSnapshot(
        (data as { snapshot_json: unknown }).snapshot_json,
      );
      if (!snapshot) {
        throw new Error("Restore snapshot payload is invalid.");
      }

      const saveResult = await saveTripMutation.mutateAsync(
        buildSaveInputFromSnapshot(input.tripId, snapshot, input.expectedUpdatedAt),
      );

      return loadTripMutation.mutateAsync(saveResult.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-library"] });
      queryClient.invalidateQueries({ queryKey: ["trip-versions"] });
    },
  });

  const logSuggestionAuditMutation = useMutation({
    mutationFn: async (input: SuggestionAuditInput): Promise<void> => {
      if (!input.tripId || input.tripId.startsWith("local-")) {
        appendLocalSuggestionAudit(input);
        return;
      }

      const useCloud = await canUseCloudTrips();
      if (!useCloud) {
        appendLocalSuggestionAudit(input);
        return;
      }

      try {
        const { error } = await supabase.from("trip_suggestion_audit").insert({
          trip_id: input.tripId,
          original_place_key: input.originalPlaceKey,
          suggested_place_key: input.suggestedPlaceKey,
          accepted: input.accepted,
          reason: input.reason ?? null,
        });

        if (error) throw error;
      } catch (error) {
        console.warn("Suggestion audit fallback to local storage:", error);
        appendLocalSuggestionAudit(input);
      }
    },
  });

  return {
    tripSummaries: tripLibraryQuery.data ?? [],
    isLoadingTripLibrary: tripLibraryQuery.isLoading,
    tripVersions: tripVersionsQuery.data ?? [],
    isLoadingTripVersions: tripVersionsQuery.isLoading,
    saveTrip: saveTripMutation.mutateAsync,
    isSavingTrip: saveTripMutation.isPending,
    loadTrip: loadTripMutation.mutateAsync,
    isLoadingSelectedTrip: loadTripMutation.isPending,
    restoreTripVersion: restoreTripVersionMutation.mutateAsync,
    isRestoringTripVersion: restoreTripVersionMutation.isPending,
    logSuggestionAudit: logSuggestionAuditMutation.mutateAsync,
    isLoggingSuggestionAudit: logSuggestionAuditMutation.isPending,
  };
}
