import { Place, CATEGORY_ICONS, CATEGORY_COLORS } from "@/types/places";
import { MapPin, Star, Tag, Link2, MessageSquare, Instagram, Edit3, Bookmark, BookmarkCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

interface PlaceDetailModalProps {
  place: Place | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (place: Place) => void;
  isSaving?: boolean;
  onUpdate?: (place: Place) => void;
}

export default function PlaceDetailModal({ place, isOpen, onClose, onSave, isSaving, onUpdate }: PlaceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "media" | "notes">("details");
  const [saved, setSaved] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    setSaved(false);
    setIsEditingNote(false);
    setNoteDraft(place?.notes || "");
  }, [place?.id, place?.notes]);

  const handleSave = () => {
    if (!place || !onSave) return;

    const noteValue = noteDraft.trim();
    onSave({
      ...place,
      notes: noteValue.length > 0 ? noteValue : undefined,
    });
    setSaved(true);
  };

  const handleSaveNote = () => {
    if (!place) return;

    const noteValue = noteDraft.trim();
    const updatedPlace = {
      ...place,
      notes: noteValue.length > 0 ? noteValue : undefined,
    };

    if (onUpdate) {
      onUpdate(updatedPlace);
      setSaved(true);
    } else if (onSave) {
      onSave(updatedPlace);
      setSaved(true);
    }

    setIsEditingNote(false);
  };

  if (!place) return null;

  const color = CATEGORY_COLORS[place.category];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92dvh] sm:max-w-md p-0 overflow-hidden bg-black/60 backdrop-blur-3xl border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl">
        {/* Header Cover Image */}
        {place.imageUrl ? (
          <div className="relative h-56 w-full bg-secondary/20">
            <img src={place.imageUrl} alt={place.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
            
            <div 
              className="absolute -bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-xl text-3xl z-10"
              style={{ color, boxShadow: `0 8px 32px ${color}40` }}
            >
              {CATEGORY_ICONS[place.category]}
            </div>
          </div>
        ) : (
          <div className="relative pt-12 pb-2 w-full bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
            <div 
              className="mx-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl text-3xl z-10"
              style={{ color, boxShadow: `0 8px 32px ${color}20` }}
            >
              {CATEGORY_ICONS[place.category]}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="px-4 sm:px-6 pt-10 pb-6 relative z-0 overflow-y-auto max-h-[calc(92dvh-9.5rem)]">
          <DialogTitle className="text-2xl font-heading font-bold text-white tracking-tight">
            {place.name}
          </DialogTitle>
          <div className="mt-2 flex items-center gap-1.5 text-white/60">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{place.address}</p>
          </div>
          
          {place.rating && (
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-lg ring-1 ring-warning/20">
                <Star className="h-4 w-4 fill-current" />
                {place.rating}
              </span>
              {/* Save Button */}
              {onSave && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    saved
                      ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                      : "bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/30"
                  } disabled:opacity-50`}
                >
                  {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaving ? "Saving..." : saved ? "Saved!" : "Save Place"}
                </button>
              )}
            </div>
          )}

          {/* Save button when no rating */}
          {!place.rating && onSave && (
            <div className="mt-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                  saved
                    ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                    : "bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/30"
                } disabled:opacity-50`}
              >
                {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaving ? "Saving..." : saved ? "Saved!" : "Save Place"}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 flex gap-4 overflow-x-auto border-b border-white/10 px-1 pb-1">
            <button 
              onClick={() => setActiveTab("details")}
              className={`shrink-0 pb-2 text-sm font-semibold transition-colors relative ${activeTab === "details" ? "text-primary" : "text-white/40 hover:text-white/80"}`}
            >
              Details
              {activeTab === "details" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab("notes")}
              className={`shrink-0 pb-2 text-sm font-semibold transition-colors relative ${activeTab === "notes" ? "text-primary" : "text-white/40 hover:text-white/80"}`}
            >
              Notes & Tags
              {activeTab === "notes" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab("media")}
              className={`shrink-0 pb-2 text-sm font-semibold transition-colors relative ${activeTab === "media" ? "text-primary" : "text-white/40 hover:text-white/80"}`}
            >
              Social Media
              {activeTab === "media" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-5 min-h-[150px]">
            {activeTab === "details" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-white/70 leading-relaxed font-medium">
                  {noteDraft.trim().length > 0
                    ? noteDraft
                    : "No description provided. Click the button below to add your own personal notes about this location."}
                </p>

                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      rows={4}
                      placeholder="Add a short note about why this place matters..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white outline-none focus:border-primary/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNote}
                        disabled={isSaving}
                        className="flex-1 rounded-lg bg-primary/20 py-2 text-sm font-semibold text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/30 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save Note"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingNote(false);
                          setNoteDraft(place.notes || "");
                        }}
                        className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingNote(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98]"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {noteDraft.trim().length > 0 ? "Edit Note" : "Leave a Note"}
                  </button>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/50">My Tags</span>
                    <button className="text-primary hover:text-primary/80"><Edit3 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {place.tags.length > 0 ? (
                      place.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white/10 text-white/80 ring-1 ring-white/10">
                          <Tag className="h-3 w-3 opacity-50" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/40 italic">No tags added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/60 mb-3">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Save Social Inspiration</h4>
                  <p className="text-xs text-white/50 mt-1 mb-4">Paste links from Instagram, TikTok, or YouTube to keep your aesthetic references.</p>
                  
                  <div className="w-full relative">
                    <input 
                      type="url" 
                      placeholder="Paste reel link here..." 
                      className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-3 pr-10 text-xs text-white outline-none focus:border-primary/50"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70">
                      <Link2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
