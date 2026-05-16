// src/features/booking/api/useFareEstimate.ts
import { useQuery } from '@tanstack/react-query';

export type VehicleType = 'bike' | 'auto' | 'shared_auto';

export function useFareEstimate(pickupId?: string, dropId?: string) {
  return useQuery({
    queryKey: ['fareEstimate', pickupId, dropId],
    queryFn: async () => {
      // TODO: Replace with apiClient.post('/users/fare/estimate', { pickup, drop })
      await new Promise((resolve) => setTimeout(resolve, 700));

      return {
        distance_km: 22,
        duration_minutes: 28,
        route: { from: 'Silvassa, D&NH', to: 'Vapi, Gujarat' },
        fares: {
          bike: { base: 15, dist: 33, distRate: 1.5, platform: 5, gst: 2.65, total: 56 },
          auto: { base: 20, dist: 55, distRate: 2.5, platform: 5, gst: 4.0, total: 84 },
          shared_auto: { base: 10, dist: 0, distRate: 0, platform: 3, gst: 0.65, total: 50 }, // Per seat logic
        },
      };
    },
  });
}