import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Place, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/places";
import { useEffect } from "react";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createCategoryIcon(category: Place["category"]) {
  const color = CATEGORY_COLORS[category];
  const icon = CATEGORY_ICONS[category];
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.3);
    ">
      <span style="transform: rotate(45deg); font-size: 16px;">${icon}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, map]);
  return null;
}

interface MapViewProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
  selectedPlaceId?: string | null;
}

export default function MapView({ places, onPlaceClick, selectedPlaceId }: MapViewProps) {
  const center: [number, number] = places.length > 0 
    ? [places[0].lat, places[0].lng] 
    : [41.9028, 12.4964];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds places={places} />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={createCategoryIcon(place.category)}
          eventHandlers={{
            click: () => onPlaceClick?.(place),
          }}
        >
          <Popup>
            <div className="min-w-[200px]">
              <p className="font-semibold text-sm">{place.name}</p>
              <p className="text-xs text-gray-500 mt-1">{place.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
