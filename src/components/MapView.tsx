import { useEffect, useRef } from "react";
import { Place, CATEGORY_COLORS, CATEGORY_ICONS } from "@/types/places";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_ID = "d92a874bf13d983229168fd9";

// Force dark style in code regardless of cloud config
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4b5563" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
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
        backgroundColor: "#11111d",
        clickableIcons: false,
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
        const shadow = isSelected
          ? `drop-shadow(0 0 8px ${color})`
          : `drop-shadow(0 4px 6px rgba(0,0,0,0.5))`;

        // Custom SVG teardrop pin
        const svgIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${44 * scale}" height="${52 * scale}" viewBox="0 0 44 52">
              <path d="M22 2C13.163 2 6 9.163 6 18c0 12 16 32 16 32s16-20 16-32C38 9.163 30.837 2 22 2z" 
                fill="${color}" 
                stroke="${isSelected ? 'white' : 'rgba(255,255,255,0.4)'}" 
                stroke-width="${isSelected ? 2.5 : 1.5}"
                filter="url(#shadow)"/>
              <circle cx="22" cy="18" r="9" fill="rgba(0,0,0,0.35)"/>
              <text x="22" y="23" text-anchor="middle" font-size="11" font-family="system-ui">
                ${CATEGORY_ICONS[place.category]}
              </text>
              ${isSelected ? `<circle cx="22" cy="18" r="13" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>` : ''}
            </svg>`)}`,
          scaledSize: new google.maps.Size(44 * scale, 52 * scale),
          anchor: new google.maps.Point(22 * scale, 52 * scale),
        };

        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          icon: svgIcon,
          zIndex: isSelected ? 1000 : 1,
          title: place.name,
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
