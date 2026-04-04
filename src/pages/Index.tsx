import { useState, useCallback } from "react";
import { Place, MapView as MapViewType, TripBucketItem } from "@/types/places";
import { mockPlaces } from "@/data/mockPlaces";
import MapView from "@/components/MapView";
import PlacesSidebar from "@/components/PlacesSidebar";
import TripBucket from "@/components/TripBucket";
import { Route } from "lucide-react";

const Index = () => {
  const [places] = useState<Place[]>(mockPlaces);
  const [activeView, setActiveView] = useState<MapViewType>("my-places");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [bucketItems, setBucketItems] = useState<TripBucketItem[]>([]);
  const [bucketOpen, setBucketOpen] = useState(false);

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

  const handleRemoveFromBucket = useCallback((id: string) => {
    setBucketItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const filteredPlaces = places.filter((p) => {
    if (selectedTags.length === 0) return true;
    return selectedTags.some((t) => p.tags.includes(t));
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <PlacesSidebar
        places={places}
        activeView={activeView}
        onViewChange={setActiveView}
        onPlaceClick={setSelectedPlace}
        onAddToBucket={handleAddToBucket}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
      />

      {/* Map Area */}
      <div className="relative flex-1">
        <MapView
          places={filteredPlaces}
          onPlaceClick={setSelectedPlace}
          selectedPlaceId={selectedPlace?.id}
        />

        {/* Bucket Toggle */}
        <button
          onClick={() => setBucketOpen(!bucketOpen)}
          className="absolute top-4 right-4 z-[500] flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-secondary"
        >
          <Route className="h-4 w-4 text-primary" />
          Trip Bucket
          {bucketItems.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {bucketItems.length}
            </span>
          )}
        </button>

        {/* Trip Bucket Panel */}
        <TripBucket
          items={bucketItems}
          onReorder={setBucketItems}
          onRemove={handleRemoveFromBucket}
          isOpen={bucketOpen}
          onToggle={() => setBucketOpen(false)}
        />
      </div>
    </div>
  );
};

export default Index;
