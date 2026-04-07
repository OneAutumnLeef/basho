import { useEffect, useRef } from "react";
import { Place, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/places";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Dark mode map style matching the app's glassmorphic aesthetic
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "landscape", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2e1a" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111827" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4b5563" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0d1b2a" }] },
];

interface MapViewProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
  selectedPlaceId?: string | null;
  routeData?: any;
}

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps) return resolve();
    const interval = setInterval(() => {
      if ((window as any).google?.maps) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

export default function MapView({ places, onPlaceClick, selectedPlaceId, routeData }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any>(null);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;

    async function init() {
      await waitForGoogleMaps();
      if (mapInstanceRef.current) return; // already init

      const google = (window as any).google;
      const center = places.length > 0 
        ? { lat: places[0].lat, lng: places[0].lng }
        : { lat: 12.9716, lng: 77.5946 };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    init();
  }, []);

  // Sync markers when places change
  useEffect(() => {
    waitForGoogleMaps().then(() => {
      if (!mapInstanceRef.current) return;
      const google = (window as any).google;
      const map = mapInstanceRef.current;

      // Remove old markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();

      // Add new markers
      places.forEach((place) => {
        const isSelected = selectedPlaceId === place.id;
        const color = CATEGORY_COLORS[place.category];
        const icon = CATEGORY_ICONS[place.category];
        const scale = isSelected ? 1.4 : 1;

        const markerEl = document.createElement("div");
        markerEl.style.cssText = `
          background: ${color};
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg) scale(${scale});
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: ${isSelected ? `0 12px 24px ${color}80, 0 0 0 4px ${color}40` : '0 4px 12px rgba(0,0,0,0.4)'};
          border: ${isSelected ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.3)'};
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;

        const inner = document.createElement("span");
        inner.style.cssText = "transform: rotate(45deg); font-size: 15px; line-height: 1; pointer-events: none;";
        inner.textContent = icon;
        markerEl.appendChild(inner);

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: place.lat, lng: place.lng },
          map,
          content: markerEl,
          zIndex: isSelected ? 1000 : 1,
        });

        marker.addListener("click", () => onPlaceClick?.(place));
        markersRef.current.set(place.id, marker);
      });

      // Auto-fit bounds
      if (places.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, { padding: 80 });
        if (places.length === 1) map.setZoom(15);
      }
    });
  }, [places, selectedPlaceId, onPlaceClick]);

  // Draw route polyline
  useEffect(() => {
    waitForGoogleMaps().then(() => {
      if (!mapInstanceRef.current) return;
      const google = (window as any).google;

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (routeData?.geometry?.coordinates?.length) {
        const path = routeData.geometry.coordinates.map((c: number[]) => ({
          lat: c[1],
          lng: c[0],
        }));

        polylineRef.current = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#3b82f6",
          strokeOpacity: 1,
          strokeWeight: 5,
          map: mapInstanceRef.current,
        });
      }
    });
  }, [routeData]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full"
      style={{ background: "#1a1a2e" }}
    />
  );
}
