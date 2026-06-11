// src/features/booking/api/useLocationSearch.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface PlaceSearchResult {
  place_id:    string;
  name:        string;
  address:     string;
  coordinates: { lat: number; lng: number };
}

// ── Secure Backend Parser ──────────────────────────────────────────────────
// Parses Nakshathra's ApiResponse: { success: true, data: [ ...results ] }
function parseResults(response: any): PlaceSearchResult[] {
  if (!response) return [];

  // Extract the results array whether it's nested inside 'data' or at the root
  const results = response?.data || response;

  if (Array.isArray(results)) {
    return results.map((r: any, i: number) => ({
      place_id:    r.place_id ?? r.id ?? String(i),
      name:        r.name ?? r.place_name?.split(',')[0] ?? r.text ?? 'Unknown',
      address:     r.address ?? r.place_name ?? '',
      coordinates: {
        lat: r.coordinates?.lat ?? r.center?.[1] ?? r.lat ?? 0,
        lng: r.coordinates?.lng ?? r.center?.[0] ?? r.lng ?? 0,
      },
    }));
  }

  return [];
}

export function useLocationSearch(
  query:     string,
  nearLat?:  number,
  nearLng?:  number,
) {
  return useQuery({
    queryKey: ['locationSearch', query, nearLat, nearLng],
    queryFn:  async (): Promise<PlaceSearchResult[]> => {
      if (!query || query.length < 2) return [];

      try {
        // Hitting the new secure backend endpoint
        const res = await apiClient.get('/locations/search', {
          params: {
            q:     query,
            lat:   nearLat,
            lng:   nearLng,
            limit: 8,
          },
        });
        
        return parseResults(res.data);
      } catch (error) {
        console.error("Location search failed:", error);
        return [];
      }
    },
    enabled:   !!query && query.length >= 2,
    staleTime: 1000 * 30, // 30s cache — search results don't change fast
    retry:     false,
  });
}