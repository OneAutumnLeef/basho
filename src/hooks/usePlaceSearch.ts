import { useQuery } from '@tanstack/react-query';
import { Place, PlaceCategory } from '@/types/places';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let placesServiceInstance: any = null;

function initGoogleMapsService(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) {
      if (!placesServiceInstance) {
        placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
      }
      return resolve(placesServiceInstance);
    }
    
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      // If script is already loading, wait for it
      const interval = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          clearInterval(interval);
          placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
          resolve(placesServiceInstance);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      placesServiceInstance = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
      resolve(placesServiceInstance);
    };
    script.onerror = () => {
      reject(new Error("Failed to load Google Maps JS SDK"));
    };
    document.head.appendChild(script);
  });
}

function mapGoogleTypeToCategory(types: string[]): PlaceCategory {
  if (!types || types.length === 0) return 'other';
  const typeMap: Record<string, PlaceCategory> = {
    'restaurant': 'dining',
    'cafe': 'cafe',
    'bar': 'dining',
    'lodging': 'accommodation',
    'hotel': 'accommodation',
    'museum': 'historic',
    'park': 'nature',
    'tourist_attraction': 'attraction',
    'airport': 'transport',
    'train_station': 'transport',
    'transit_station': 'transport',
  };

  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  return 'other';
}

export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: ['placeSearch', query],
    queryFn: async (): Promise<Place[]> => {
      if (!query || query.length < 3) return [];
      
      if (GOOGLE_API_KEY) {
        const service = await initGoogleMapsService();
        return new Promise<Place[]>((resolve, reject) => {
          service.textSearch({ query }, (results: any[], status: string) => {
            if (status !== 'OK' && status !== 'ZERO_RESULTS') {
              console.error("Google Places Error:", status);
              return reject(new Error(`Google Places API returned status: ${status}`));
            }
            if (!results) return resolve([]);

            const mappedPlaces = results.map(p => {
              let imageUrl = undefined;
              if (p.photos && p.photos.length > 0) {
                // Request the photo using the built-in lazy loader with max width
                imageUrl = p.photos[0].getUrl({ maxWidth: 400 });
              }

              return {
                id: `google-${p.place_id}`,
                originalId: p.place_id,
                name: p.name || 'Unknown Place',
                address: p.formatted_address || 'Unknown Address',
                lat: p.geometry?.location?.lat() || 0,
                lng: p.geometry?.location?.lng() || 0,
                category: mapGoogleTypeToCategory(p.types || []),
                rating: p.rating,
                imageUrl,
                tags: [],
                createdAt: new Date().toISOString()
              };
            });
            resolve(mappedPlaces);
          });
        });
      } else {
        // Fallback to Photon
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`);
        if (!res.ok) throw new Error('Photon search failed');
        
        const data = await res.json();
        
        return data.features.map((f: any) => {
          const p = f.properties;
          const addressParts = [p.street, p.city, p.state, p.country].filter(Boolean);
          const address = addressParts.join(', ') || 'Unknown Address';
          
          let category: PlaceCategory = 'other';
          const osmValue = p.osm_value?.toLowerCase() || '';
          
          if (['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(osmValue)) category = 'dining';
          else if (['hotel', 'hostel', 'motel', 'guest_house'].includes(osmValue)) category = 'accommodation';
          else if (['museum', 'gallery', 'memorial', 'monument', 'ruins', 'historic'].includes(osmValue) || p.osm_key === 'historic') category = 'historic';
          else if (['park', 'forest', 'beach', 'nature_reserve'].includes(osmValue)) category = 'nature';
          else if (['attraction', 'theme_park', 'zoo', 'viewpoint'].includes(osmValue)) category = 'attraction';
          else if (['station', 'airport', 'subway', 'bus_stop'].includes(osmValue)) category = 'transport';

          return {
            id: `search-${p.osm_id || Math.random()}`,
            originalId: p.osm_id?.toString(),
            name: p.name || 'Unknown Place',
            address,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            category,
            rating: undefined,
            tags: [],
            createdAt: new Date().toISOString()
          };
        });
      }
    },
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 60 * 24, // Cache heavily for 24 hours to reduce API burn
    gcTime: 1000 * 60 * 60 * 24,
  });
}
