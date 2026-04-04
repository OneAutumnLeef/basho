import { TripBucketItem, Place } from "@/types/places";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
}

function SortableItem({ item, onRemove }: { item: TripBucketItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 group">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-sm flex-shrink-0"
        style={{ backgroundColor: CATEGORY_COLORS[item.place.category] + "22", color: CATEGORY_COLORS[item.place.category] }}
      >
        {CATEGORY_ICONS[item.place.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.place.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.place.address}</p>
      </div>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function TripBucket({ items, onReorder, onRemove, isOpen, onToggle }: TripBucketProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  // Mock route data
  const totalDistance = items.length > 1 ? `${(items.length * 2.3).toFixed(1)} km` : "—";
  const totalTime = items.length > 1 ? `${items.length * 18} min` : "—";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 h-full w-80 border-l border-border bg-background/95 backdrop-blur-xl z-[500] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-base font-heading font-semibold text-foreground">Trip Bucket</h2>
              <p className="text-xs text-muted-foreground">{items.length} stops planned</p>
            </div>
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Route Summary */}
          {items.length > 1 && (
            <div className="mx-4 mt-3 flex gap-3 rounded-lg bg-primary/10 border border-primary/20 p-3">
              <div className="flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">{totalDistance}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">{totalTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Walking</span>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Route className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No stops yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click places on the sidebar to add them to your trip</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, idx) => (
                    <div key={item.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {idx + 1}
                        </span>
                        {idx > 0 && (
                          <span className="text-[10px] text-muted-foreground">~{Math.round(Math.random() * 15 + 5)} min walk</span>
                        )}
                      </div>
                      <SortableItem item={item} onRemove={() => onRemove(item.id)} />
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Generate Route Button */}
          {items.length > 1 && (
            <div className="border-t border-border p-4">
              <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Generate Optimized Route
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
