// src/features/booking/api/useHomeData.ts
import { useQuery } from '@tanstack/react-query';

// We define the types here so the UI knows exactly what to expect
export type VehicleType = 'bike' | 'auto' | 'shared_auto';

export function useHomeData(currentLocation?: { lat: number; lng: number }) {
  return useQuery({
    queryKey: ['homeData', currentLocation],
    queryFn: async () => {
      // TODO (Week 2): Replace this with actual Axios call to intern's API
      // const res = await apiClient.get('/users/location/service-availability', { params: { location: currentLocation }});
      // return res.data;

      // Simulate network delay for now
      await new Promise((resolve) => setTimeout(resolve, 600));

      return {
        is_serviceable: true,
        quickRoutes: [
          { from: 'Silvassa', to: 'Vapi', km: 22, from_price: 55 },
          { from: 'Vapi', to: 'Daman', km: 18, from_price: 45 },
          { from: 'Daman', to: 'Silvassa', km: 32, from_price: 75 },
          { from: 'Bhilad', to: 'Silvassa', km: 14, from_price: 35 },
        ],
        vehicles: [
          { id: 'bike' as VehicleType, label: 'Bike', price: 55, tag: 'CHEAPEST', tagStyle: 'primary' as const },
          { id: 'auto' as VehicleType, label: 'Auto', price: 79, tag: '4 SEATS', tagStyle: 'faint' as const },
          { id: 'shared_auto' as VehicleType, label: 'Shared Auto', price: 50, tag: 'PER SEAT', tagStyle: 'muted' as const },
        ],
      };
    },
  });
}