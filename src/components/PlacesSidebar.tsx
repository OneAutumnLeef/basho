import {
  Place,
  MapView as MapViewType,
  PlaceCategory,
  CATEGORY_ICONS,
  PlannerSettings,
} from "@/types/places";
import { Search, Filter, X, UserPlus, Users, Check, Ban, Clock3 } from "lucide-react";
import { useState } from "react";
import PlaceCard from "./PlaceCard";

interface IncomingFriendRequest {
  id: string;
  fromEmail: string;
}

interface OutgoingFriendRequest {
  id: string;
  toEmail: string;
}

interface PlacesSidebarProps {
  places: Place[];
  activeView: MapViewType;
  onViewChange: (view: MapViewType) => void;
  onPlaceClick: (place: Place) => void;
  onAddToBucket: (place: Place) => void;
  onSavePlace: (place: Place) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isSearching: boolean;
  isSearchMode: boolean;
  plannerSettings: PlannerSettings;
  onPlannerSettingsChange: (updates: Partial<PlannerSettings>) => void;
  isAuthenticated?: boolean;
  friendCount?: number;
  incomingFriendRequests?: IncomingFriendRequest[];
  outgoingFriendRequests?: OutgoingFriendRequest[];
  onSendFriendRequest?: (email: string) => void | Promise<void>;
  onAcceptFriendRequest?: (requestId: string) => void | Promise<void>;
  onDeclineFriendRequest?: (requestId: string) => void | Promise<void>;
  isSendingFriendRequest?: boolean;
  isRespondingFriendRequest?: boolean;
}

const VIEW_LABELS: Record<MapViewType, string> = {
  "my-places": "My Places",
  friends: "Friends",
  public: "Public",
};

const VIBE_OPTIONS = [
  "Night Out",
  "Coffee Crawl",
  "Culture Walk",
  "Nature Reset",
  "Food Crawl",
  "Romantic",
];

const TIME_WINDOW_OPTIONS: Array<{ value: PlannerSettings["timeWindow"]; label: string }> = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "late-night", label: "Late Night" },
];

export default function PlacesSidebar({
  places,
  activeView,
  onViewChange,
  onPlaceClick,
  onAddToBucket,
  onSavePlace,
  selectedTags,
  onTagToggle,
  searchQuery,
  onSearchChange,
  isSearching,
  isSearchMode,
  plannerSettings,
  onPlannerSettingsChange,
  isAuthenticated = false,
  friendCount = 0,
  incomingFriendRequests = [],
  outgoingFriendRequests = [],
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  isSendingFriendRequest = false,
  isRespondingFriendRequest = false,
}: PlacesSidebarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | null>(null);
  const [friendEmail, setFriendEmail] = useState("");

  const allTags = [...new Set(places.flatMap((p) => p.tags))];

  const displayPlaces = places.filter((p) => {
    if (isSearchMode) return true; // If in search mode, places are already the filtered results from API
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => p.tags.includes(t));
    const matchesCat = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesTags && matchesCat;
  });

  const handleSendFriendRequest = async () => {
    if (!onSendFriendRequest) return;
    const normalizedEmail = friendEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    try {
      await onSendFriendRequest(normalizedEmail);
      setFriendEmail("");
    } catch {
      // Parent callback handles user-facing error toast.
    }
  };

  const categories = Object.entries(CATEGORY_ICONS) as [PlaceCategory, string][];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-black/40 backdrop-blur-2xl">
      {/* Header */}
      <div className="px-6 pt-8 pb-5 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <img 
            src="https://images.prismic.io/derajportfolio/adV7P-zlhpBNhbdU_basho.png?auto=format,compress" 
            alt="Basho" 
            className="h-9 w-9 object-contain"
          />
          <h1 className="text-2xl font-heading font-bold text-white tracking-wide">
            Basho
          </h1>
        </div>
        <p className="text-sm text-white/50 mt-1 uppercase tracking-widest font-semibold">From vibe to viable plans in under 60s.</p>
      </div>

      {/* View Toggle */}
      <div className="px-6 pb-4">
        <div className="flex gap-1 p-1 bg-black/40 rounded-xl ring-1 ring-white/10 shadow-inner">
          {(Object.keys(VIEW_LABELS) as MapViewType[]).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`flex-1 rounded-lg px-3 py-2 text-[11px] uppercase tracking-wider font-bold transition-all ${
                activeView === view
                  ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                  : "text-white/40 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {activeView === "friends" && (
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                <Users className="h-3.5 w-3.5" />
                Friends Network
              </p>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/75">
                {friendCount} connected
              </span>
            </div>

            {isAuthenticated ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={friendEmail}
                    onChange={(event) => setFriendEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendFriendRequest();
                      }
                    }}
                    placeholder="friend@email.com"
                    className="h-9 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs font-semibold text-white placeholder:text-white/35 outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => void handleSendFriendRequest()}
                    disabled={isSendingFriendRequest || friendEmail.trim().length === 0}
                    className="inline-flex h-9 min-w-[88px] items-center justify-center gap-1 rounded-lg bg-primary/90 px-2 text-[10px] font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isSendingFriendRequest ? "Sending" : "Add"}
                  </button>
                </div>

                {incomingFriendRequests.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Incoming</p>
                    <div className="mt-2 space-y-1.5">
                      {incomingFriendRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1.5">
                          <span className="truncate text-[11px] font-medium text-white/80">{request.fromEmail}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => void onAcceptFriendRequest?.(request.id)}
                              disabled={isRespondingFriendRequest}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-200 transition-colors hover:bg-emerald-500/35 disabled:opacity-50"
                              title="Accept request"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => void onDeclineFriendRequest?.(request.id)}
                              disabled={isRespondingFriendRequest}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/20 text-rose-200 transition-colors hover:bg-rose-500/35 disabled:opacity-50"
                              title="Decline request"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outgoingFriendRequests.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                      <Clock3 className="h-3.5 w-3.5" />
                      Pending
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {outgoingFriendRequests.map((request) => (
                        <p key={request.id} className="truncate rounded-md bg-white/5 px-2 py-1.5 text-[11px] font-medium text-white/70">
                          {request.toEmail}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-white/60">
                Sign in to connect with friends and see their pinned places.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="px-6 pb-4">
        <div className="rounded-xl border border-white/10 bg-black/35 p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Discovery Context</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={plannerSettings.city}
              onChange={(event) => onPlannerSettingsChange({ city: event.target.value })}
              placeholder="City"
              className="col-span-2 h-9 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs font-semibold text-white placeholder:text-white/35 outline-none focus:border-primary/50"
            />
            <select
              value={plannerSettings.vibe}
              onChange={(event) => onPlannerSettingsChange({ vibe: event.target.value })}
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs font-semibold text-white outline-none focus:border-primary/50"
            >
              {VIBE_OPTIONS.map((vibe) => (
                <option key={vibe} value={vibe}>{vibe}</option>
              ))}
            </select>
            <select
              value={plannerSettings.timeWindow}
              onChange={(event) =>
                onPlannerSettingsChange({
                  timeWindow: event.target.value as PlannerSettings["timeWindow"],
                })
              }
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs font-semibold text-white outline-none focus:border-primary/50"
            >
              {TIME_WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pb-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search places or global tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
              showFilters ? "text-primary" : "text-white/40 hover:text-white"
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Categories */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold ml-1">Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(([cat, icon]) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] ring-1 ring-primary"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white ring-1 ring-white/10"
                    }`}
                  >
                    <span className="mr-1.5 opacity-80">{icon}</span> {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tags */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold ml-1">Tags</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagToggle(tag)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : "bg-black/30 text-white/40 hover:bg-white/5 hover:text-white/80 ring-1 ring-white/5"
                    }`}
                  >
                    {selectedTags.includes(tag) && <X className="inline h-3 w-3 mr-1 -ml-1" />}
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Places List */}
      <div className="relative mt-2 flex-1 min-h-0">
        {/* Gradient fade at top of list */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/10 to-transparent z-10 pointer-events-none" />
        
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 space-y-3 custom-scrollbar">
          <div className="px-2 pt-2">
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              {isSearchMode
                ? `Global Search: ${displayPlaces.length} entries found`
                : activeView === "friends"
                  ? `${displayPlaces.length} friend pins`
                  : `${displayPlaces.length} places pinned`}
              {isSearching && <span className="ml-2 animate-pulse text-primary">...</span>}
            </p>
          </div>
          
          {displayPlaces.map((place, idx) => (
            <div key={place.id} className="relative group/card mx-1">
              <PlaceCard place={place} onClick={() => onPlaceClick(place)} index={idx} />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSearchMode) onSavePlace(place);
                  else onAddToBucket(place);
                }}
                className={`absolute right-3 top-3 flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground opacity-100 shadow-lg backdrop-blur-sm transition-all sm:opacity-0 sm:group-hover/card:opacity-100 active:scale-95 ${isSearchMode ? "bg-accent/90 hover:bg-accent" : "bg-primary/90 hover:bg-primary"}`}
              >
                {isSearchMode ? "+ Map" : "+ Trip"}
              </button>
            </div>
          ))}

          {displayPlaces.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-4">
                <Filter className="h-5 w-5 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/70">
                {isSearchMode
                  ? "No locations found"
                  : activeView === "friends"
                    ? "No friend pins yet"
                    : "No places found"}
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                {isSearchMode
                  ? "Try checking spelling"
                  : activeView === "friends"
                    ? isAuthenticated
                      ? "Connect with friends to unlock their shared pins"
                      : "Sign in to connect with friends"
                    : "Try adjusting your search or filters"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
