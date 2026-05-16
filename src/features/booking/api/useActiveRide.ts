// src/features/booking/api/useActiveRide.ts
import { useQuery } from '@tanstack/react-query';

export function useActiveRide() {
  return useQuery({
    queryKey: ['activeRide'],
    queryFn: async () => {
      // TODO (Week 3): Replace with apiClient.get('/users/rides/active')
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        status: 'DRIVER_ON_THE_WAY',
        status_text: 'Driver is on the way',
        eta_minutes: 4,
        route: { from: 'Silvassa', to: 'Vapi', distance_km: 22 },
        vehicle: 'Bike',
        fare: 56,
        driver: {
          initials: 'RK',
          name: 'Ramesh Kumar',
          rating: 4.9,
          trips: 2847,
          plate: 'GJ05 AK 3721',
          on_time_pct: 98,
        }
      };
    },
  });
}