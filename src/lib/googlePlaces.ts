const GOOGLE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY as string) || "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

let googlePlacesLoading = false;
export function loadGooglePlacesLib(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    if (googlePlacesLoading) {
      const wait = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(wait); resolve(); }
      }, 100);
      return;
    }
    googlePlacesLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      const wait = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(wait); resolve(); }
      }, 50);
    };
    document.head.appendChild(script);
  });
}

export type GooglePlaceResult = {
  photos: string[];
  reviews: any[];
  rating?: number;
  reviewsTotal?: number;
  phone?: string;
  website?: string;
  opening_hours?: string;
  placeId?: string;
};

export function extractPlaceResult(place: any): Omit<GooglePlaceResult, "placeId"> {
  const photos = place.photos
    ? place.photos.slice(0, 5).map((p: any) => p.getUrl({ maxWidth: 400, maxHeight: 300 }))
    : [];
  const reviews = place.reviews
    ? place.reviews.slice(0, 5).map((r: any) => ({
        author: r.author_name || "Anonyme",
        avatar: r.profile_photo_url || null,
        rating: r.rating,
        text: r.text || "",
        time: r.relative_time_description || "",
      }))
    : [];
  return {
    photos,
    reviews,
    rating: place.rating,
    reviewsTotal: place.user_ratings_total,
    phone: place.formatted_phone_number,
    website: place.website,
    opening_hours: place.opening_hours?.isOpen?.()
      ? "🟢 Ouvert maintenant"
      : place.opening_hours?.weekday_text?.join(" • "),
  };
}

export function fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceResult> {
  return loadGooglePlacesLib().then(
    () =>
      new Promise((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);
        const g = (window as any).google;
        const service = new g.maps.places.PlacesService(div);
        service.getDetails(
          {
            placeId,
            fields: ["rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"],
          },
          (place: any, status: string) => {
            document.body.removeChild(div);
            if (status !== g.maps.places.PlacesServiceStatus.OK || !place) {
              resolve({ photos: [], reviews: [] });
              return;
            }
            resolve({ ...extractPlaceResult(place), placeId });
          }
        );
      })
  );
}

export function fetchGooglePlaceByLocation(lat: number, lng: number, name: string): Promise<GooglePlaceResult> {
  return loadGooglePlacesLib().then(
    () =>
      new Promise((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);
        const g = (window as any).google;
        const service = new g.maps.places.PlacesService(div);
        service.nearbySearch(
          { location: { lat, lng }, radius: 80, keyword: name },
          (results: any[], status: string) => {
            if (status !== g.maps.places.PlacesServiceStatus.OK || !results?.[0]?.place_id) {
              document.body.removeChild(div);
              resolve({ photos: [], reviews: [] });
              return;
            }
            const placeId = results[0].place_id as string;
            service.getDetails(
              {
                placeId,
                fields: ["rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"],
              },
              (place: any, detailStatus: string) => {
                document.body.removeChild(div);
                if (detailStatus !== g.maps.places.PlacesServiceStatus.OK || !place) {
                  resolve({ photos: [], reviews: [] });
                  return;
                }
                resolve({ ...extractPlaceResult(place), placeId });
              }
            );
          }
        );
      })
  );
}

export function fetchGoogleGasStation(lat: number, lng: number): Promise<GooglePlaceResult> {
  return loadGooglePlacesLib().then(
    () =>
      new Promise((resolve) => {
        const div = document.createElement("div");
        document.body.appendChild(div);
        const g = (window as any).google;
        const service = new g.maps.places.PlacesService(div);
        service.nearbySearch(
          { location: { lat, lng }, radius: 150, type: "gas_station" },
          (results: any[], status: string) => {
            if (status !== g.maps.places.PlacesServiceStatus.OK || !results?.[0]?.place_id) {
              document.body.removeChild(div);
              resolve({ photos: [], reviews: [] });
              return;
            }
            const placeId = results[0].place_id as string;
            service.getDetails(
              {
                placeId,
                fields: ["rating", "user_ratings_total", "photos", "opening_hours"],
              },
              (place: any, detailStatus: string) => {
                document.body.removeChild(div);
                if (detailStatus !== g.maps.places.PlacesServiceStatus.OK || !place) {
                  resolve({ photos: [], reviews: [] });
                  return;
                }
                resolve({ ...extractPlaceResult(place), placeId });
              }
            );
          }
        );
      })
  );
}
