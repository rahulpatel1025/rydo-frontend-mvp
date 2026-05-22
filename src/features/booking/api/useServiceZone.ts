// src/features/booking/api/useServiceZone.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface ServiceZoneResult {
  service_available: boolean;
  message: string;
  nearest_zone: {
    id: string;
    name: string | null;
    center: { lat: number | null; lng: number | null };
    radius_km: number | null;
    distance_km: number;
  } | null;
}

export function useServiceZone(coords?: { lat: number; lng: number }) {
  return useQuery({
    queryKey: ['serviceZone', coords?.lat, coords?.lng],
    queryFn: async (): Promise<ServiceZoneResult> => {
      const res = await apiClient.post('/locations/service-availability/check', {
        lat: coords!.lat,
        lng: coords!.lng,
      });
      return res.data;
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 5, // cache for 5 mins — zone doesn't change often
  });
}