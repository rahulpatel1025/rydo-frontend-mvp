// src/features/booking/api/useHomeData.ts
import { useQuery } from '@tanstack/react-query';
import { useServiceZone } from './useServiceZone';
import { getRouteFare } from './useFareEstimate';

export type VehicleType = 'bike' | 'auto' | 'shared_auto';

export interface QuickRoute {
  from: string;
  to: string;
  km: number;
  from_price: number;
}

export interface VehicleOption {
  id: VehicleType;
  label: string;
  price: number;
  tag: string;
  tagStyle: 'primary' | 'faint' | 'muted';
}

export interface HomeData {
  is_serviceable: boolean;
  quickRoutes: QuickRoute[];
  vehicles: VehicleOption[];
  nearbyDriverCount: number;
}

// Real routes from RIDO policy doc with fares calculated from fare engine
const QUICK_ROUTES: QuickRoute[] = [
  { from: 'Silvassa', to: 'Vapi',     km: 20, from_price: getRouteFare(20, 'bike').total },
  { from: 'Vapi',     to: 'Daman',    km: 12, from_price: getRouteFare(12, 'bike').total },
  { from: 'Daman',    to: 'Silvassa', km: 30, from_price: getRouteFare(30, 'bike').total },
  { from: 'Bhilad',   to: 'Silvassa', km:  8, from_price: getRouteFare( 8, 'bike').total },
];

export function useHomeData(currentLocation?: { lat: number; lng: number }) {
  const { data: zoneData, isLoading: zoneLoading, error: zoneError } = useServiceZone(currentLocation);

  console.log('[HomeData] currentLocation:', currentLocation);
  console.log('[HomeData] zoneLoading:', zoneLoading);
  console.log('[HomeData] zoneData:', JSON.stringify(zoneData));
  console.log('[HomeData] zoneError:', zoneError?.message);
  return useQuery({
    queryKey: ['homeData', currentLocation?.lat, currentLocation?.lng, zoneData?.service_available],
    queryFn: async (): Promise<HomeData> => {
      const isServiceable = zoneData?.service_available ?? true;

      if (!isServiceable) {
        return {
          is_serviceable: false,
          quickRoutes: [],
          vehicles: [],
          nearbyDriverCount: 0,
        };
      }

      return {
        is_serviceable: true,
        quickRoutes: QUICK_ROUTES,
        vehicles: [
          {
            id: 'bike',
            label: 'Bike',
            price: getRouteFare(20, 'bike').total,  // Silvassa→Vapi as reference
            tag: 'CHEAPEST',
            tagStyle: 'primary',
          },
          {
            id: 'auto',
            label: 'Auto',
            price: getRouteFare(20, 'auto').total,
            tag: '4 SEATS',
            tagStyle: 'faint',
          },
          {
            id: 'shared_auto',
            label: 'Shared Auto',
            price: getRouteFare(20, 'shared_auto').total,
            tag: 'PER SEAT',
            tagStyle: 'muted',
          },
        ],
        nearbyDriverCount: 0, // TODO: wire to /api/locations/drivers/nearby
      };
    },
    enabled: true,
  });
}