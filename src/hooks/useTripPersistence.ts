import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Place, PlannerSettings, RouteMode, TripBucketItem } from "@/types/places";
import {
  SaveTripInput,
  SavedTripData,
  SavedTripSummary,
  SuggestionAuditInput,
  TripSource,
} from "@/types/trips";

const LOCAL_TRIPS_KEY = "basho-local-trips-v1";
const LOCAL_SUGGESTION_AUDIT_KEY = "basho-local-suggestion-audit-v1";

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

function upsertLocalTrip(input: SaveTripInput): { id: string; source: TripSource } {
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
    return { id: updated.id, source: "local" };
  }

  const created = createLocalTripRecord(input);
  trips.unshift(created);
  safeWriteLocalTrips(trips);
  return { id: created.id, source: "local" };
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

async function canUseCloudTrips(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

export function useTripPersistence() {
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

  const saveTripMutation = useMutation({
    mutationFn: async (input: SaveTripInput): Promise<{ id: string; source: TripSource }> => {
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

        if (tripId && !tripId.startsWith("local-")) {
          const { error: updateError } = await supabase
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
              updated_at: new Date().toISOString(),
            })
            .eq("id", tripId)
            .eq("owner_user_id", session.user.id);

          if (updateError) throw updateError;
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
            .select("id")
            .single();

          if (insertError) throw insertError;
          tripId = (inserted as { id: string }).id;
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

        return { id: tripId, source: "cloud" };
      } catch (error) {
        console.warn("Trip save fallback to local storage:", error);
        return upsertLocalTrip(input);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-library"] });
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
    saveTrip: saveTripMutation.mutateAsync,
    isSavingTrip: saveTripMutation.isPending,
    loadTrip: loadTripMutation.mutateAsync,
    isLoadingSelectedTrip: loadTripMutation.isPending,
    logSuggestionAudit: logSuggestionAuditMutation.mutateAsync,
    isLoggingSuggestionAudit: logSuggestionAuditMutation.isPending,
  };
}
