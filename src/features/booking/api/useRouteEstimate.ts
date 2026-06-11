import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface RouteEstimate {
  service_available: boolean;
  distance_km:       number;
  duration_mins:     number;
  geometry:          string;
}

export interface RouteCoords {
  pickup_lat: number;
  pickup_lng: number;
  drop_lat:   number;
  drop_lng:   number;
}

export function useRouteEstimate(coords?: RouteCoords) {
  return useQuery({
    queryKey: ['route', coords?.pickup_lat, coords?.pickup_lng, coords?.drop_lat, coords?.drop_lng],
    
    queryFn: async (): Promise<RouteEstimate> => {
      // 🚀 We removed the try/catch block. 
      // If Axios gets a 503, it will automatically throw an error, 
      // which React Query will instantly catch and set isError: true.
      const res = await apiClient.post('/locations/route', coords);
      
      const payload = res.data?.data || res.data;

return {
  service_available:
    payload.service_available ?? true,
  distance_km:
    payload.distance_km || 0,
  duration_mins:
    payload.duration_mins || 0,
  geometry:
    payload.geometry || "",
};
    },
    
    // 🚀 STRICT ENABLED: Only trigger if we have all 4 exact coordinates
    enabled: !!(coords?.pickup_lat && coords?.pickup_lng && coords?.drop_lat && coords?.drop_lng),
    
    staleTime: 1000 * 60 * 2,
    
    // 🚀 FAIL-FAST: If the route engine is down, kill the loading state instantly
    retry: false, 
  });
}