import { TripBucketItem, Place } from "@/types/places";
import {
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Route, Clock, Navigation, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/types/places";

interface TripBucketProps {
  items: TripBucketItem[];
  onReorder: (items: TripBucketItem[]) => void;
  onRemove: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  routeData?: any;
  onOptimizeRoute: () => void;
  isLoadingRoute?: boolean;
}

function SortableItem({ item, onRemove }: { item: TripBucketItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 group transition-colors hover:bg-white/10 ${isDragging ? "shadow-2xl ring-1 ring-primary/50" : "shadow-sm"}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-white/30 hover:text-white/70 active:cursor-grabbing transition-colors">
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-base flex-shrink-0 bg-black/40 ring-1 ring-white/10 shadow-inner"
        style={{ color: CATEGORY_COLORS[item.place.category] }}
      >
        {CATEGORY_ICONS[item.place.category]}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-sm font-semibold text-white tracking-wide truncate">{item.place.name}</p>
        <p className="text-[10px] text-white/50 truncate mt-0.5">{item.place.address}</p>
      </div>
      <button
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function TripBucket({ items, onReorder, onRemove, isOpen, onToggle, routeData, onOptimizeRoute, isLoadingRoute }: TripBucketProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: 'trip-bucket-droppable',
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    
    // Sort logic inside bucket
    if (active.id !== over.id && items.some((i) => i.id === active.id)) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(items, oldIndex, newIndex));
      }
    }
  }

  // Use actual routedata from OSRM if available
  const totalDistance = routeData?.distance 
    ? `${(routeData.distance / 1000).toFixed(1)} km` 
    : items.length > 1 ? `${(items.length * 2.3).toFixed(1)} km` : "—";
    
  const totalTime = routeData?.duration 
    ? `${Math.round(routeData.duration / 60)} min` 
    : items.length > 1 ? `${items.length * 18} min` : "—";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute right-4 top-4 bottom-4 w-96 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl z-[600] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-5 bg-gradient-to-b from-white/5 to-transparent">
            <div>
              <h2 className="text-lg font-heading font-semibold text-white tracking-wide">Trip Bucket</h2>
              <p className="text-xs text-white/50 font-medium tracking-wider uppercase mt-1">{items.length} Stops Planned</p>
            </div>
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Route Summary */}
          {items.length > 1 && (
            <div className="mx-5 mt-5 flex justify-between rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-primary/70 uppercase tracking-widest font-bold">Total Distance</span>
                <div className="flex items-center gap-1.5">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-white">{totalDistance}</span>
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-primary/70 uppercase tracking-widest font-bold">Est. Time</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-white">{totalTime}</span>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-3 custom-scrollbar">
            {items.length === 0 ? (
              <div ref={setDroppableRef} className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <Route className="h-7 w-7 text-white/30" />
                </div>
                <p className="text-sm font-medium text-white/80">Your bucket is empty</p>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">Drag places from the map or click + to start planning your itinerary.</p>
              </div>
            ) : (
              <div ref={setDroppableRef} className="min-h-[100px] w-full">
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, idx) => (
                    <div key={item.id} className="relative">
                      {idx > 0 && (
                        <div className="absolute -top-3 left-[17px] h-3 w-[1px] bg-white/10 border-l border-dashed border-white/20" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center mt-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <SortableItem item={item} onRemove={() => onRemove(item.id)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </div>
            )}
          </div>

          {/* Generate Route Button */}
          {items.length > 1 && (
            <div className="p-5 border-t border-white/10 bg-black/20">
              <button
                onClick={onOptimizeRoute}
                disabled={isLoadingRoute}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingRoute ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> Calculating...</>
                ) : (
                  <><Navigation className="h-4 w-4" /> Generate Optimized Route</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
