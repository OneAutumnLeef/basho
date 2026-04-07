import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from "react-leaflet";
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

function createCategoryIcon(category: Place["category"], isSelected: boolean = false) {
  const color = CATEGORY_COLORS[category];
  const icon = CATEGORY_ICONS[category];
  
  const scale = isSelected ? 1.3 : 1;
  const border = isSelected ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.3)';
  const shadow = isSelected ? `0 12px 24px ${color}80, 0 0 0 4px ${color}40` : '0 4px 12px rgba(0,0,0,0.4)';
  const zIndex = isSelected ? 1000 : 0;
  
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) scale(${scale});
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadow};
      border: ${border};
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      z-index: ${zIndex};
    ">
      <span style="transform: rotate(45deg); font-size: 16px;">${icon}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function FitBounds({ places, routeData }: { places: Place[], routeData?: any }) {
  const map = useMap();
  useEffect(() => {
    if (routeData?.geometry?.coordinates?.length) {
      // route geometries from OSRM are [lng, lat], let's flip for leaflet [lat, lng]
      const bounds = L.latLngBounds(routeData.geometry.coordinates.map((c: any) => [c[1], c[0]]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [places, routeData, map]);
  return null;
}

interface MapViewProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
  selectedPlaceId?: string | null;
  routeData?: any;
}

export default function MapView({ places, onPlaceClick, selectedPlaceId, routeData }: MapViewProps) {
  const center: [number, number] = places.length > 0 
    ? [places[0].lat, places[0].lng] 
    : [12.9716, 77.5946];

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
        className="map-tiles"
      />
      <style>{`
        .map-tiles {
          filter: brightness(1.4) contrast(1.1);
        }
      `}</style>
      
      {/* Route Line Rendering */}
      {routeData?.geometry && (
        <GeoJSON 
          key={routeData.distance} 
          data={routeData.geometry}
          style={{
            color: '#3b82f6', // Vibrant Teravue Blue
            weight: 6,
            opacity: 1,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      )}

      <FitBounds places={places} routeData={routeData} />
      
      {places.map((place) => {
        const isSelected = selectedPlaceId === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={createCategoryIcon(place.category, isSelected)}
            eventHandlers={{
              click: () => onPlaceClick?.(place),
            }}
            zIndexOffset={isSelected ? 1000 : 0}
          />
        );
      })}
    </MapContainer>
  );
}
