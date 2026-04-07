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
  if (!types || types.length === 0) return 'dining';
  return 'dining';
}

function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function useTrendingPlaces() {
  return useQuery({
    queryKey: ['trendingPlaces'],
    queryFn: async (): Promise<Place[]> => {
      if (GOOGLE_API_KEY) {
        const service = await initGoogleMapsService();
        return new Promise<Place[]>((resolve, reject) => {
          // Broad query for dining
          service.textSearch({ query: "Top Restobars in Bangalore" }, (results: any[], status: string) => {
            if (status !== 'OK' && status !== 'ZERO_RESULTS') {
              console.error("Google Places Error:", status);
              return reject(new Error(`Google Places API returned status: ${status}`));
            }
            if (!results) return resolve([]);

            // Pick 5 random places
            const randomPick = shuffleArray(results).slice(0, 5);

            const mappedPlaces = randomPick.map(p => {
              let imageUrl = undefined;
              if (p.photos && p.photos.length > 0) {
                imageUrl = p.photos[0].getUrl({ maxWidth: 400 });
              }

              return {
                id: `google-trending-${p.place_id}`,
                originalId: p.place_id,
                name: p.name || 'Unknown Place',
                address: p.formatted_address || 'Unknown Address',
                lat: p.geometry?.location?.lat() || 0,
                lng: p.geometry?.location?.lng() || 0,
                category: mapGoogleTypeToCategory(p.types || []),
                rating: p.rating,
                imageUrl,
                tags: ["trending", "restobar"],
                createdAt: new Date().toISOString()
              };
            });
            resolve(mappedPlaces);
          });
        });
      } else {
        // Fallback to Photon
        const res = await fetch(`https://photon.komoot.io/api/?q=restobar+bangalore&limit=15`);
        if (!res.ok) throw new Error('Photon search failed');
        const data = await res.json();
        
        const randomPick = shuffleArray(data.features).slice(0, 5);
        
        return randomPick.map((f: any) => {
          const p = f.properties;
          const addressParts = [p.street, p.city, p.state, p.country].filter(Boolean);
          const address = addressParts.join(', ') || 'Unknown Address';

          return {
            id: `trending-${p.osm_id || Math.random()}`,
            originalId: p.osm_id?.toString(),
            name: p.name || 'Unknown Place',
            address,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            category: 'dining',
            rating: undefined,
            tags: ["trending"],
            createdAt: new Date().toISOString()
          };
        });
      }
    },
    // Keep it cached to prevent burning quota on every refresh!
    staleTime: 1000 * 60 * 60 * 12, 
    gcTime: 1000 * 60 * 60 * 12,
  });
}
