import { useState, useCallback, useEffect, useMemo } from "react";
import { Place, MapView as MapViewType, TripBucketItem } from "@/types/places";
import MapView from "@/components/MapView";
import PlacesSidebar from "@/components/PlacesSidebar";
import TripBucket from "@/components/TripBucket";
import PlaceDetailModal from "@/components/PlaceDetailModal";
import PlaceCard from "@/components/PlaceCard";
import LandingPage from "@/components/LandingPage";
import { Route } from "lucide-react";
import { useRoute } from "@/hooks/useRoute";
import { usePlaces } from "@/hooks/usePlaces";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useSavePlace } from "@/hooks/useSavePlace";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingPlaces } from "@/hooks/useTrendingPlaces";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";

const Index = () => {
  const { data: dbPlaces = [], isLoading: isLoadingPlaces } = usePlaces();
  const { data: trendingPlaces = [], isLoading: isTrending } = useTrendingPlaces();
  const { mutate: savePlaceMutation } = useSavePlace();
  
  const [hasLanded, setHasLanded] = useState(false);
  const [activeView, setActiveView] = useState<MapViewType>("public");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [bucketItems, setBucketItems] = useState<TripBucketItem[]>([]);
  const [bucketOpen, setBucketOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearching } = usePlaceSearch(debouncedQuery);
  const isSearchMode = debouncedQuery.length >= 3;

  // Final places to render on the map and sidebar
  const displayedPlaces = useMemo(() => {
    if (isSearchMode) return searchResults;
    let filtered: Place[] = [];
    
    // Simulate activeView logic - in a complete backend, this would query different Supabase tables/views
    if (activeView === "friends") {
      filtered = []; // You have no friends yet :( 
    } else if (activeView === "my-places") {
      filtered = dbPlaces;
    } else if (activeView === "public") {
      filtered = trendingPlaces; // Inject 5 random Google Places
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.some((t) => p.tags?.includes(t))
      );
    }
    return filtered;
  }, [dbPlaces, trendingPlaces, selectedTags, isSearchMode, searchResults, activeView]);

  // Route — only fetch when user explicitly requests it
  const [showRoute, setShowRoute] = useState(false);
  const bucketPlaces = bucketItems.map(item => item.place);
  const { data: routeData, isLoading: isLoadingRoute, refetch: refetchRoute } = useRoute(
    showRoute ? bucketPlaces : []
  );

  const handleOptimizeRoute = useCallback(() => {
    setShowRoute(true);
    refetchRoute();
  }, [refetchRoute]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleAddToBucket = useCallback((place: Place) => {
    setBucketItems((prev) => {
      if (prev.some((i) => i.place.id === place.id)) return prev;
      return [...prev, { id: `bucket-${place.id}`, place, order: prev.length }];
    });
    setBucketOpen(true);
  }, []);

  const handleSavePlace = useCallback((place: Place) => {
    savePlaceMutation(place);
  }, [savePlaceMutation]);

  const handleRemoveFromBucket = useCallback((id: string) => {
    setBucketItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current) {
      setActiveDragItem(event.active.data.current);
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
         setBucketItems(newArr);
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
      <div className="relative h-screen w-screen overflow-hidden bg-background">
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
        <div className="pointer-events-none absolute inset-0 z-10 flex p-4">
          {/* Left Sidebar */}
          <div className="pointer-events-auto h-full w-[380px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative z-20">
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
              isSearching={isSearching}
              isSearchMode={isSearchMode}
            />
          </div>

          {/* Right Area (Bucket Toggle & Bucket Panel) */}
          <div className="pointer-events-auto absolute top-4 right-4 flex flex-col items-end z-[501]">
            <button
              onClick={() => setBucketOpen(!bucketOpen)}
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
          </div>
        </div>

        {/* Floating Trip Bucket Component */}
        <div className="pointer-events-auto z-[500]">
          <TripBucket
            items={bucketItems}
            onReorder={setBucketItems}
            onRemove={handleRemoveFromBucket}
            isOpen={bucketOpen}
            onToggle={() => setBucketOpen(false)}
            routeData={routeData}
            onOptimizeRoute={handleOptimizeRoute}
            isLoadingRoute={isLoadingRoute}
          />
        </div>
        
        {/* Place Detail Modal */}
        <PlaceDetailModal 
          place={selectedPlace}
          isOpen={!!selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      </div>

      <DragOverlay zIndex={9999}>
        {activeDragItem?.place ? (
          <div className="w-[300px] shadow-2xl opacity-90 scale-105 pointer-events-none">
            <PlaceCard place={activeDragItem.place} isCompact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Index;
