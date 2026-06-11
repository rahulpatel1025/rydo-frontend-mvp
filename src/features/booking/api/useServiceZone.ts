import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface ServiceZoneResult {
  is_serviceable:       boolean;
  message?:             string;
  nearest_zone?:        { name: string | null; distance_km: number } | null;
  available_ride_types?: string[];
}

export function useServiceZone(coords?: { lat: number; lng: number }) {
  return useQuery({
    queryKey: ['serviceZone', coords?.lat, coords?.lng],
    queryFn:  async (): Promise<ServiceZoneResult> => {
      try {
        const res = await apiClient.post('/locations/service-availability/check', {
          lat: coords!.lat,
          lng: coords!.lng,
        });

        // Smart unwrapper: safely bypasses Nakshathra's ApiResponse layer
        const payload = res.data?.data || res.data;

        return {
          is_serviceable:  payload?.service_available ?? payload?.is_serviceable ?? false,
          message:         payload?.message ?? res.data?.message,
          nearest_zone:    payload?.nearest_zone,
        };
      } catch (error) {
        console.error("[Prod Guard] Service zone check failed:", error);
        
        // PRODUCTION FIX: Fail closed. If the server is down or unreachable,
        // do not allow the user to proceed with booking a ghost ride.
        return { 
          is_serviceable: false, 
          message: "Unable to verify service area at this time." 
        };
      }
    },
    enabled:   !!coords,
    staleTime: 1000 * 60 * 5, // 5 min cache is perfect for production
    retry:     false,
  });
}