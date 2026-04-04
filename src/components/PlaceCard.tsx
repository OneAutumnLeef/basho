import { Place, CATEGORY_ICONS, CATEGORY_COLORS } from "@/types/places";
import { MapPin, Star, GripVertical } from "lucide-react";
import { motion } from "framer-motion";

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
  isDraggable?: boolean;
  isCompact?: boolean;
  index?: number;
}

export default function PlaceCard({ place, onClick, isDraggable, isCompact, index = 0 }: PlaceCardProps) {
  const color = CATEGORY_COLORS[place.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onClick}
      className="group relative flex gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer transition-all hover:border-primary/30 hover:bg-secondary/50"
    >
      {isDraggable && (
        <div className="flex items-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {place.imageUrl && !isCompact && (
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          <img
            src={place.imageUrl}
            alt={place.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground truncate">{place.address}</p>
            </div>
          </div>
          <span
            className="flex-shrink-0 text-base"
            title={place.category}
          >
            {CATEGORY_ICONS[place.category]}
          </span>
        </div>

        {!isCompact && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {place.rating && (
              <span className="flex items-center gap-0.5 text-xs text-warning">
                <Star className="h-3 w-3 fill-current" />
                {place.rating}
              </span>
            )}
            {place.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {place.notes && !isCompact && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1 italic">
            "{place.notes}"
          </p>
        )}
      </div>

      {/* Category accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}
