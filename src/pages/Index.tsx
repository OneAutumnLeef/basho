import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AutoFixSuggestion,
  DiscoveryContext,
  Place,
  MapView as MapViewType,
  PlannerSettings,
  RouteMode,
  TripBucketItem,
} from "@/types/places";
import MapView from "@/components/MapView";
import PlacesSidebar from "@/components/PlacesSidebar";
import TripBucket from "@/components/TripBucket";
import TripShareDialog from "@/components/TripShareDialog";
import PlaceDetailModal from "@/components/PlaceDetailModal";
import PlaceCard from "@/components/PlaceCard";
import LandingPage from "@/components/LandingPage";
import TripGuideDialog from "@/components/TripGuideDialog";
import { CircleHelp, Compass, Route } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRoute } from "@/hooks/useRoute";
import { usePlaces } from "@/hooks/usePlaces";
import { useFriends } from "@/hooks/useFriends";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useSavePlace } from "@/hooks/useSavePlace";
import { TripSaveConflictError, useTripPersistence } from "@/hooks/useTripPersistence";
import { useTripVotes } from "@/hooks/useTripVotes";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingPlaces } from "@/hooks/useTrendingPlaces";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  buildAutoFixSuggestions,
  computePlanner,
  DEFAULT_DWELL_MINUTES_BY_PACE,
  normalizeDwellMinutes,
} from "@/lib/planner";
import {
  buildShareableTripPayload,
  buildShareableTripUrl,
  decodeShareableTrip,
  encodeShareableTrip,
} from "@/lib/trip-share";
import { APP_BASE_PATH, getAuthRedirectUrl } from "@/lib/app-url";
import {
  ShareableTripPayload,
  ShareableTripStop,
  TripVoteInsights,
} from "@/types/trips";
import { buildTripVoteInsights } from "@/lib/vote-insights";

const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  city: "Bangalore",
  vibe: "Night Out",
  startTime: "18:30",
  timeWindow: "evening",
  pace: "balanced",
};

const SEARCH_DEBOUNCE_MS = 900;
const DISCOVERY_CONTEXT_DEBOUNCE_MS = 1000;
const SEARCH_MIN_QUERY_LENGTH = 4;

function normalizeBucketOrder(items: TripBucketItem[]): TripBucketItem[] {
  return items.map((item, order) => ({ ...item, order }));
}

function mapSharedStopsToBucketItems(stops: ShareableTripStop[]): TripBucketItem[] {
  return stops.map((stop, index) => ({
    id: `bucket-shared-${index}-${stop.id}`,
    order: index,
    dwellMinutes: stop.dwellMinutes,
    place: {
      id: stop.id,
      originalId: stop.id,
      name: stop.name,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.category,
      tags: ["shared"],
      createdAt: new Date().toISOString(),
    },
  }));
}

const Index = () => {
  const isMobile = useIsMobile();
  const { data: dbPlaces = [], isLoading: isLoadingPlaces } = usePlaces();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    friendPlaces,
    isLoadingFriends,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    isSendingFriendRequest,
    isRespondingToFriendRequest,
  } = useFriends();
  const { mutate: savePlaceMutation, isPending: isSavingPlace } = useSavePlace();
  
  const [hasLanded, setHasLanded] = useState(false);
  const [activeView, setActiveView] = useState<MapViewType>("public");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [bucketItems, setBucketItems] = useState<TripBucketItem[]>([]);
  const [bucketOpen, setBucketOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [plannerSettings, setPlannerSettings] = useState<PlannerSettings>(DEFAULT_PLANNER_SETTINGS);
  const [routeMode, setRouteMode] = useState<RouteMode>("optimize");
  const [tripName, setTripName] = useState("My Basho Plan");
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [currentTripUpdatedAt, setCurrentTripUpdatedAt] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [tripGuideOpen, setTripGuideOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<ShareableTripPayload | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharedLinkView, setIsSharedLinkView] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);

  const activePersistenceTripId = currentTripId || selectedTripId;

  const {
    tripSummaries,
    isLoadingTripLibrary,
    tripVersions,
    isLoadingTripVersions,
    saveTrip,
    isSavingTrip,
    loadTrip,
    isLoadingSelectedTrip,
    restoreTripVersion,
    isRestoringTripVersion,
    logSuggestionAudit,
  } = useTripPersistence(activePersistenceTripId);

  const activeTripId = activePersistenceTripId;
  const {
    voteSummaries,
    voteActivity,
    isVoting,
    voteOnPlace,
    canVote,
    voteDisabledReason,
  } = useTripVotes(activeTripId);

  const voteSummaryByPlaceKey = useMemo(
    () =>
      voteSummaries.reduce<Record<string, (typeof voteSummaries)[number]>>((acc, summary) => {
        acc[summary.placeKey] = summary;
        return acc;
      }, {}),
    [voteSummaries],
  );

  const voteInsights = useMemo<TripVoteInsights>(
    () => buildTripVoteInsights(bucketItems, voteSummaryByPlaceKey, voteActivity),
    [bucketItems, voteSummaryByPlaceKey, voteActivity],
  );

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const discoveryContext = useMemo<DiscoveryContext>(
    () => ({
      city: plannerSettings.city,
      vibe: plannerSettings.vibe,
      timeWindow: plannerSettings.timeWindow,
    }),
    [plannerSettings.city, plannerSettings.vibe, plannerSettings.timeWindow],
  );

  const [debouncedDiscoveryContext, setDebouncedDiscoveryContext] = useState<DiscoveryContext>(
    discoveryContext,
  );

  const isSearchMode = debouncedQuery.length >= SEARCH_MIN_QUERY_LENGTH;
  const shouldFetchTrending = (activeView === "public" && !isSearchMode) || bucketItems.length > 0;

  const { data: trendingPlaces = [], isLoading: isTrending } = useTrendingPlaces(
    debouncedDiscoveryContext,
    { enabled: shouldFetchTrending },
  );

  // Search debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDiscoveryContext(discoveryContext);
    }, DISCOVERY_CONTEXT_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [discoveryContext]);

  const isSupabaseConfigured =
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const isAuthenticated = Boolean(authEmail);

  useEffect(() => {
    setSelectedVersionId(null);
  }, [activePersistenceTripId]);

  // Keep auth status in sync for explicit save/collab CTA controls.
  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setAuthEmail(session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const planToken = url.searchParams.get("plan");
    if (!planToken) return;

    const decoded = decodeShareableTrip(planToken);
    if (!decoded) return;

    setSharePayload(decoded);
    setShareUrl(window.location.href);
    setIsSharedLinkView(true);
    setShareDialogOpen(true);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setBucketOpen(false);
      return;
    }

    setSidebarOpen(true);
  }, [isMobile]);

  const { data: searchResults = [], isLoading: isSearching } = usePlaceSearch(
    debouncedQuery,
    debouncedDiscoveryContext,
  );
  const isSidebarLoading =
    isSearching ||
    isLoadingPlaces ||
    isTrending ||
    (activeView === "friends" && isLoadingFriends);

  // Final places to render on the map and sidebar
  const displayedPlaces = useMemo(() => {
    if (isSearchMode) return searchResults;
    let filtered: Place[] = [];
    
    if (activeView === "friends") {
      filtered = friendPlaces;
    } else if (activeView === "my-places") {
      filtered = dbPlaces;
    } else if (activeView === "public") {
      filtered = trendingPlaces;
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((t) => p.tags?.includes(t))
      );
    }
    return filtered;
  }, [
    dbPlaces,
    friendPlaces,
    trendingPlaces,
    selectedTags,
    isSearchMode,
    searchResults,
    activeView,
  ]);

  // Route — only fetch when user explicitly requests it
  const [showRoute, setShowRoute] = useState(false);
  const bucketPlaces = bucketItems.map((item) => item.place);
  const { data: routeData, isLoading: isLoadingRoute, refetch: refetchRoute } = useRoute(
    showRoute ? bucketPlaces : [],
    { mode: routeMode, profile: "walking" }
  );

  const planner = useMemo(
    () => computePlanner(bucketItems, showRoute ? routeData ?? null : null, plannerSettings),
    [bucketItems, routeData, showRoute, plannerSettings],
  );

  const suggestionCandidates = useMemo(() => {
    const merged = [...trendingPlaces, ...searchResults, ...dbPlaces];
    const uniqueMap = new Map<string, Place>();

    merged.forEach((place) => {
      uniqueMap.set(place.id, place);
    });

    return Array.from(uniqueMap.values());
  }, [trendingPlaces, searchResults, dbPlaces]);

  const autoFixSuggestions = useMemo<AutoFixSuggestion[]>(
    () =>
      buildAutoFixSuggestions(
        bucketItems,
        planner.stops,
        suggestionCandidates,
        plannerSettings,
      ),
    [bucketItems, planner.stops, suggestionCandidates, plannerSettings],
  );

  useEffect(() => {
    if (bucketItems.length < 2 && showRoute) {
      setShowRoute(false);
    }
  }, [bucketItems.length, showRoute]);

  const handleOptimizeRoute = useCallback(async () => {
    setShowRoute(true);
    const result = await refetchRoute();
    const fetchedRoute = result.data;

    if (routeMode !== "optimize" || !fetchedRoute?.waypointOrder?.length) {
      return;
    }

    setBucketItems((prev) => {
      if (fetchedRoute.waypointOrder.length !== prev.length) {
        return prev;
      }

      const reordered = fetchedRoute.waypointOrder
        .map((index) => prev[index])
        .filter(Boolean);

      if (reordered.length !== prev.length) {
        return prev;
      }

      const isAlreadyAligned = reordered.every(
        (item, index) => item.id === prev[index]?.id,
      );

      if (isAlreadyAligned) {
        return prev;
      }

      return normalizeBucketOrder(reordered);
    });
  }, [refetchRoute, routeMode]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleAddToBucket = useCallback((place: Place) => {
    const defaultDwellMinutes = DEFAULT_DWELL_MINUTES_BY_PACE[plannerSettings.pace];

    setBucketItems((prev) => {
      if (prev.some((i) => i.place.id === place.id)) return prev;
      return normalizeBucketOrder([
        ...prev,
        {
          id: `bucket-${place.id}`,
          place,
          order: prev.length,
          dwellMinutes: defaultDwellMinutes,
        },
      ]);
    });

    if (isMobile) {
      setSidebarOpen(false);
    }

    setBucketOpen(true);
  }, [isMobile, plannerSettings.pace]);

  const handleUpdatePlannerSettings = useCallback(
    (updates: Partial<PlannerSettings>) => {
      setPlannerSettings((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleUpdateDwellMinutes = useCallback(
    (itemId: string, dwellMinutes: number) => {
      setBucketItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                dwellMinutes: normalizeDwellMinutes(dwellMinutes, plannerSettings.pace),
              }
            : item,
        ),
      );
    },
    [plannerSettings.pace],
  );

  const handleSavePlace = useCallback((place: Place) => {
    savePlaceMutation(place);
  }, [savePlaceMutation]);

  const handleRemoveFromBucket = useCallback((id: string) => {
    setBucketItems((prev) => normalizeBucketOrder(prev.filter((i) => i.id !== id)));
  }, []);

  const handleApplySuggestion = useCallback(
    (itemId: string, suggestion: AutoFixSuggestion) => {
      const sourceItem = bucketItems.find((item) => item.id === itemId);
      const originalPlaceKey = sourceItem?.place.originalId || sourceItem?.place.id;

      setBucketItems((prev) =>
        normalizeBucketOrder(
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  place: suggestion.candidate,
                  dwellMinutes:
                    item.dwellMinutes ?? DEFAULT_DWELL_MINUTES_BY_PACE[plannerSettings.pace],
                }
              : item,
          ),
        ),
      );

      if (bucketItems.length > 1) {
        setShowRoute(true);
      }

      if (activeTripId && originalPlaceKey) {
        void logSuggestionAudit({
          tripId: activeTripId,
          originalPlaceKey,
          suggestedPlaceKey: suggestion.candidate.originalId || suggestion.candidate.id,
          accepted: true,
          reason: suggestion.reason,
        });
      }

      setSelectedPlace(suggestion.candidate);
    },
    [activeTripId, bucketItems, logSuggestionAudit, plannerSettings.pace],
  );

  const handleVotePlace = useCallback(
    async (placeKey: string, placeName: string, vote: -1 | 1) => {
      if (!activeTripId) {
        toast.error("Save or load a trip before voting.");
        return;
      }

      if (!canVote) {
        toast.error(voteDisabledReason || "Voting is currently unavailable for this trip.");
        return;
      }

      try {
        await voteOnPlace({
          tripId: activeTripId,
          placeKey,
          placeName,
          vote,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to submit vote right now.";
        toast.error(message);
      }
    },
    [activeTripId, canVote, voteDisabledReason, voteOnPlace],
  );

  const handleSignIn = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured for sign-in.");
      return;
    }

    setIsAuthActionPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      toast.error(`Sign-in failed: ${error.message}`);
    }

    setIsAuthActionPending(false);
  }, [isSupabaseConfigured]);

  const handleSignOut = useCallback(async () => {
    setIsAuthActionPending(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(`Sign-out failed: ${error.message}`);
    } else {
      toast.success("Signed out.");
      setCurrentTripId(null);
      setCurrentTripUpdatedAt(null);
    }

    setIsAuthActionPending(false);
  }, []);

  const handleSendFriendRequest = useCallback(
    async (email: string) => {
      try {
        const action = await sendFriendRequest(email);

        if (action === "accepted") {
          toast.success("Friend request accepted and connection created.");
        } else {
          toast.success("Friend request sent.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send friend request.";
        toast.error(message);
        throw error;
      }
    },
    [sendFriendRequest],
  );

  const handleAcceptFriendRequest = useCallback(
    async (requestId: string) => {
      try {
        await acceptFriendRequest(requestId);
        toast.success("Friend request accepted.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not accept friend request.";
        toast.error(message);
      }
    },
    [acceptFriendRequest],
  );

  const handleDeclineFriendRequest = useCallback(
    async (requestId: string) => {
      try {
        await declineFriendRequest(requestId);
        toast.success("Friend request declined.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not decline friend request.";
        toast.error(message);
      }
    },
    [declineFriendRequest],
  );

  const handleSaveTrip = useCallback(async () => {
    if (bucketItems.length === 0) return;

    try {
      const result = await saveTrip({
        tripId: currentTripId,
        expectedUpdatedAt: currentTripUpdatedAt,
        name: tripName.trim() || "My Basho Plan",
        settings: plannerSettings,
        routeMode,
        planScore: planner.score.overall,
        items: bucketItems,
      });

      setCurrentTripId(result.id);
      setCurrentTripUpdatedAt(result.updatedAt);
      setSelectedTripId(result.id);
      setSelectedVersionId(null);
      toast.success("Trip saved.");
    } catch (error) {
      if (error instanceof TripSaveConflictError) {
        toast.error("Trip changed elsewhere. Load latest trip and retry your save.");
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to save trip right now.";
      toast.error(message);
    }
  }, [
    bucketItems,
    currentTripId,
    currentTripUpdatedAt,
    planner.score.overall,
    plannerSettings,
    routeMode,
    saveTrip,
    tripName,
  ]);

  const handleLoadSelectedTrip = useCallback(async () => {
    if (!selectedTripId) return;

    const loaded = await loadTrip(selectedTripId);
    if (!loaded) return;

    setCurrentTripId(loaded.id);
    setCurrentTripUpdatedAt(loaded.updatedAt);
    setSelectedTripId(loaded.id);
    setSelectedVersionId(null);
    setTripName(loaded.name);
    setPlannerSettings(loaded.settings);
    setRouteMode(loaded.routeMode);
    setBucketItems(normalizeBucketOrder(loaded.items));
    if (isMobile) {
      setSidebarOpen(false);
    }
    setBucketOpen(true);
    setShowRoute(false);
  }, [isMobile, loadTrip, selectedTripId]);

  const handleRestoreTripVersion = useCallback(async () => {
    if (!activePersistenceTripId || !selectedVersionId) return;

    try {
      const restored = await restoreTripVersion({
        tripId: activePersistenceTripId,
        versionId: selectedVersionId,
        expectedUpdatedAt: currentTripUpdatedAt,
      });

      if (!restored) {
        toast.error("Restore point unavailable.");
        return;
      }

      setCurrentTripId(restored.id);
      setCurrentTripUpdatedAt(restored.updatedAt);
      setSelectedTripId(restored.id);
      setSelectedVersionId(null);
      setTripName(restored.name);
      setPlannerSettings(restored.settings);
      setRouteMode(restored.routeMode);
      setBucketItems(normalizeBucketOrder(restored.items));
      setShowRoute(false);
      if (isMobile) {
        setSidebarOpen(false);
      }
      setBucketOpen(true);
      toast.success("Trip restored from selected restore point.");
    } catch (error) {
      if (error instanceof TripSaveConflictError) {
        toast.error("Trip changed elsewhere. Load latest trip and retry restore.");
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to restore this version.";
      toast.error(message);
    }
  }, [
    activePersistenceTripId,
    currentTripUpdatedAt,
    isMobile,
    restoreTripVersion,
    selectedVersionId,
  ]);

  const handleOpenShareTrip = useCallback(() => {
    if (planner.stops.length === 0 || typeof window === "undefined") return;

    const payload = buildShareableTripPayload({
      name: tripName.trim() || "My Basho Plan",
      settings: plannerSettings,
      routeMode,
      score: planner.score.overall,
      stops: planner.stops,
    });
    const token = encodeShareableTrip(payload);
    const canonicalBaseUrl = new URL(APP_BASE_PATH, window.location.origin).toString();
    const url = buildShareableTripUrl(token, canonicalBaseUrl);

    setSharePayload(payload);
    setShareUrl(url);
    setIsSharedLinkView(false);
    setShareDialogOpen(true);
  }, [planner.score.overall, planner.stops, plannerSettings, routeMode, tripName]);

  const handleImportSharedTrip = useCallback(() => {
    if (!sharePayload) return;

    const importedItems = mapSharedStopsToBucketItems(sharePayload.stops);
    setTripName(sharePayload.name || "Imported Basho Plan");
    setPlannerSettings({
      city: sharePayload.settings.city,
      vibe: sharePayload.settings.vibe,
      startTime: sharePayload.settings.startTime,
      timeWindow: sharePayload.settings.timeWindow,
      pace: sharePayload.settings.pace,
    });
    setRouteMode(sharePayload.routeMode);
    setBucketItems(normalizeBucketOrder(importedItems));
    setBucketOpen(true);
    setShowRoute(false);
    setCurrentTripId(null);
    setCurrentTripUpdatedAt(null);
    setSelectedTripId(null);
    setSelectedVersionId(null);
    setIsSharedLinkView(false);

    if (typeof window !== "undefined") {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("plan");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, [sharePayload]);

  const [activeDragItem, setActiveDragItem] = useState<{ place?: Place } | null>(null);

  const handleToggleBucket = useCallback(() => {
    setBucketOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setSidebarOpen(false);
      }
      return next;
    });
  }, [isMobile]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && isMobile) {
        setBucketOpen(false);
      }
      return next;
    });
  }, [isMobile]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragData = event.active.data.current as { place?: Place } | undefined;
    if (dragData) {
      setActiveDragItem(dragData);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;
    
    // Sort logic inside TripBucket
    if (active.id.toString().startsWith("bucket-") && over.id.toString().startsWith("bucket-")) {
       const oldIndex = bucketItems.findIndex((i) => i.id === active.id);
       const newIndex = bucketItems.findIndex((i) => i.id === over.id);
       if (oldIndex !== -1 && newIndex !== -1) {
         const newArr = [...bucketItems];
         const [moved] = newArr.splice(oldIndex, 1);
         newArr.splice(newIndex, 0, moved);
         setBucketItems(normalizeBucketOrder(newArr));
       }
       return;
    }

    // Drag from Sidebar INTO TripBucket
    if (active.id.toString().startsWith("sidebar-") && over.id.toString() === "trip-bucket-droppable") {
       const place = active.data.current?.place as Place;
       if (place) {
          handleAddToBucket(place);
       }
    }
  }, [bucketItems, handleAddToBucket]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative h-dvh w-full overflow-hidden bg-background">
        <AnimatePresence>
          {!hasLanded && (
            <LandingPage key="landing" onStart={() => setHasLanded(true)} />
          )}
        </AnimatePresence>

        {/* Absolute Map Background */}
        <div className="absolute inset-0 z-0">
          <MapView
            places={displayedPlaces}
            onPlaceClick={setSelectedPlace}
            selectedPlaceId={selectedPlace?.id}
            routeData={routeData}
          />
        </div>

        {/* Floating Sidebar Container */}
        <div className="pointer-events-none absolute inset-0 z-10 p-2 sm:p-4">
          {/* Left Sidebar */}
          <AnimatePresence>
            {(!isMobile || sidebarOpen) && (
              <motion.div
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pointer-events-auto absolute left-2 right-2 top-2 bottom-20 z-20 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:left-4 sm:right-auto sm:top-4 sm:bottom-4 sm:w-[380px]"
              >
                <PlacesSidebar
                  places={displayedPlaces}
                  activeView={activeView}
                  onViewChange={setActiveView}
                  onPlaceClick={setSelectedPlace}
                  onAddToBucket={handleAddToBucket}
                  onSavePlace={handleSavePlace}
                  selectedTags={selectedTags}
                  onTagToggle={handleTagToggle}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isSearching={isSidebarLoading}
                  isSearchMode={isSearchMode}
                  plannerSettings={plannerSettings}
                  onPlannerSettingsChange={handleUpdatePlannerSettings}
                  isAuthenticated={isAuthenticated}
                  friendCount={friends.length}
                  incomingFriendRequests={incomingRequests}
                  outgoingFriendRequests={outgoingRequests}
                  onSendFriendRequest={handleSendFriendRequest}
                  onAcceptFriendRequest={handleAcceptFriendRequest}
                  onDeclineFriendRequest={handleDeclineFriendRequest}
                  isSendingFriendRequest={isSendingFriendRequest}
                  isRespondingFriendRequest={isRespondingToFriendRequest}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right Area (Bucket Toggle & Help + Mobile Sidebar Toggle) */}
          <div className="pointer-events-auto absolute bottom-3 right-2 z-[501] flex flex-col items-end gap-2 sm:bottom-auto sm:right-4 sm:top-4">
            {isMobile ? (
              <button
                onClick={handleToggleSidebar}
                className="group flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 text-white/80 shadow-2xl backdrop-blur-md transition-all hover:bg-black/80 active:scale-95"
                title="Toggle explorer"
              >
                <Compass className="h-5 w-5 text-cyan-200 group-hover:text-white transition-colors" />
                <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-white/70 group-hover:text-white">
                  {sidebarOpen ? "Hide" : "Explore"}
                </span>
              </button>
            ) : null}

            <button
              onClick={handleToggleBucket}
              className="group flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-black/80 transition-all active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                 {isLoadingRoute ? (
                   <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                 ) : (
                   <Route className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                 )}
                {bucketItems.length > 0 && (
                  <span className="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                    {bucketItems.length}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium text-white/70 mt-1 uppercase tracking-wider group-hover:text-white">Trip</span>
            </button>

            <button
              onClick={() => setTripGuideOpen(true)}
              className="mt-2 group flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/55 text-white/75 shadow-xl backdrop-blur-md transition-all hover:bg-black/75 hover:text-white active:scale-95"
              title="How to use Basho"
            >
              <CircleHelp className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Floating Trip Bucket Component */}
        <div className="pointer-events-auto z-[500]">
          <TripBucket
            items={bucketItems}
            onRemove={handleRemoveFromBucket}
            isOpen={bucketOpen}
            onToggle={() => setBucketOpen(false)}
            routeData={routeData}
            onOptimizeRoute={handleOptimizeRoute}
            isLoadingRoute={isLoadingRoute}
            plannerSettings={plannerSettings}
            onPlannerSettingsChange={handleUpdatePlannerSettings}
            routeMode={routeMode}
            onRouteModeChange={setRouteMode}
            planStops={planner.stops}
            planScore={planner.score}
            onUpdateDwellMinutes={handleUpdateDwellMinutes}
            suggestions={autoFixSuggestions}
            onApplySuggestion={handleApplySuggestion}
            tripName={tripName}
            onTripNameChange={setTripName}
            savedTrips={tripSummaries}
            selectedTripId={selectedTripId}
            onSelectedTripIdChange={(tripId) => setSelectedTripId(tripId || null)}
            onSaveTrip={handleSaveTrip}
            onLoadTrip={handleLoadSelectedTrip}
            onShareTrip={handleOpenShareTrip}
            tripVersions={tripVersions}
            selectedVersionId={selectedVersionId}
            onSelectedVersionIdChange={(versionId) => setSelectedVersionId(versionId || null)}
            onRestoreTripVersion={handleRestoreTripVersion}
            isSavingTrip={isSavingTrip}
            isLoadingTripLibrary={isLoadingTripLibrary}
            isLoadingSelectedTrip={isLoadingSelectedTrip}
            isLoadingTripVersions={isLoadingTripVersions}
            isRestoringTripVersion={isRestoringTripVersion}
            voteSummaryByPlaceKey={voteSummaryByPlaceKey}
            onVotePlace={canVote ? handleVotePlace : undefined}
            isVoting={isVoting}
            voteInsights={voteInsights}
            voteDisabledReason={voteDisabledReason}
            authEmail={authEmail}
            isAuthenticated={isAuthenticated}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            isAuthActionPending={isAuthActionPending}
            isSupabaseConfigured={isSupabaseConfigured}
          />
        </div>
        
        {/* Place Detail Modal */}
        <PlaceDetailModal 
          place={selectedPlace}
          isOpen={!!selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onSave={handleSavePlace}
          onUpdate={handleSavePlace}
          isSaving={isSavingPlace}
        />

        <TripShareDialog
          open={shareDialogOpen}
          payload={sharePayload}
          shareUrl={shareUrl}
          onOpenChange={setShareDialogOpen}
          onImport={isSharedLinkView ? handleImportSharedTrip : undefined}
        />

        <TripGuideDialog open={tripGuideOpen} onOpenChange={setTripGuideOpen} />
      </div>

      <DragOverlay zIndex={9999}>
        {activeDragItem?.place ? (
          <div className="w-[min(300px,70vw)] shadow-2xl opacity-90 scale-105 pointer-events-none">
            <PlaceCard place={activeDragItem.place} isCompact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Index;
