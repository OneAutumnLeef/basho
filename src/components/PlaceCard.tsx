import { Place, CATEGORY_ICONS, CATEGORY_COLORS } from "@/types/places";
import { MapPin, Star, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
  isDraggable?: boolean;
  isCompact?: boolean;
  index?: number;
}

export default function PlaceCard({ place, onClick, isDraggable, isCompact, index = 0 }: PlaceCardProps) {
  const color = CATEGORY_COLORS[place.category];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${place.id}`,
    data: { type: 'PlaceCard', place },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 9999,
  } : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      style={style}
      className={`group relative flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 cursor-pointer transition-all hover:bg-white/10 hover:shadow-xl hover:-translate-y-0.5 ${isCompact ? "p-2" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Attach drag ref and listeners only to the handle! */}
      {isDraggable && (
        <div 
          ref={setNodeRef} 
          {...attributes} 
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center text-white/30 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pr-2"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {place.imageUrl && !isCompact && (
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl shadow-inner border border-white/10">
          <img
            src={place.imageUrl}
            alt={place.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide truncate">{place.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="h-3 w-3 text-white/40 flex-shrink-0" />
              <p className="text-xs text-white/50 truncate font-medium">{place.address}</p>
            </div>
          </div>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 bg-black/40 ring-1 ring-white/10 text-base shadow-inner group-hover:bg-white/10 transition-colors"
            title={place.category}
            style={{ color }}
          >
            {CATEGORY_ICONS[place.category]}
          </span>
        </div>

        {!isCompact && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {place.rating && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full ring-1 ring-warning/20">
                <Star className="h-3 w-3 fill-current" />
                {place.rating}
              </span>
            )}
            {place.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-white/70 ring-1 ring-white/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {place.notes && !isCompact && (
          <p className="mt-2.5 text-xs text-white/60 line-clamp-2 italic font-medium leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
            "{place.notes}"
          </p>
        )}
      </div>

      {/* Category accent gradient */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-[3px] rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
    </motion.div>
  );
}
