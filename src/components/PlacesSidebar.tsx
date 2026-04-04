import { Place, MapView as MapViewType, PlaceCategory, CATEGORY_ICONS } from "@/types/places";
import { Search, Filter, X } from "lucide-react";
import { useState } from "react";
import PlaceCard from "./PlaceCard";

interface PlacesSidebarProps {
  places: Place[];
  activeView: MapViewType;
  onViewChange: (view: MapViewType) => void;
  onPlaceClick: (place: Place) => void;
  onAddToBucket: (place: Place) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

const VIEW_LABELS: Record<MapViewType, string> = {
  "my-places": "My Places",
  friends: "Friends",
  public: "Public",
};

export default function PlacesSidebar({
  places,
  activeView,
  onViewChange,
  onPlaceClick,
  onAddToBucket,
  selectedTags,
  onTagToggle,
}: PlacesSidebarProps) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | null>(null);

  const allTags = [...new Set(places.flatMap((p) => p.tags))];

  const filtered = places.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => p.tags.includes(t));
    const matchesCat = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesTags && matchesCat;
  });

  const categories = Object.entries(CATEGORY_ICONS) as [PlaceCategory, string][];

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-background/95 backdrop-blur-xl z-[500]">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">
          Wanderlens
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your world, pinned.</p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 p-3 border-b border-border">
        {(Object.keys(VIEW_LABELS) as MapViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              activeView === view
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search places or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
              showFilters ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2 animate-fade-up">
            {/* Categories */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(([cat, icon]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {icon} {cat}
                </button>
              ))}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {selectedTags.includes(tag) && <X className="inline h-2.5 w-2.5 mr-0.5" />}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Places List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-xs text-muted-foreground mb-2">{filtered.length} places</p>
        {filtered.map((place, idx) => (
          <div key={place.id} className="relative group/card">
            <PlaceCard place={place} onClick={() => onPlaceClick(place)} index={idx} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToBucket(place);
              }}
              className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground opacity-0 group-hover/card:opacity-100 transition-opacity"
            >
              + Trip
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
