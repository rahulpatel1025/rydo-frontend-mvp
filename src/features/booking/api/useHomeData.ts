// src/features/booking/api/useHomeData.ts
import { useQuery } from '@tanstack/react-query';
import { useServiceZone } from './useServiceZone';
import { useNearbyDrivers } from './useNearbyDrivers';

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

// ── TEMPORARY MOCKS ──
// Hardcoded display prices until the backend provides a /home endpoint
const QUICK_ROUTES: QuickRoute[] = [
  { from: 'Silvassa', to: 'Vapi',     km: 20, from_price: 80 },
  { from: 'Vapi',     to: 'Daman',    km: 12, from_price: 48 },
  { from: 'Daman',    to: 'Silvassa', km: 30, from_price: 120 },
  { from: 'Bhilad',   to: 'Silvassa', km:  8, from_price: 32 },
];

export function useHomeData(currentLocation?: { lat: number; lng: number }) {
  const { data: zoneData }    = useServiceZone(currentLocation);
  const { data: driversData } = useNearbyDrivers(currentLocation, 5, 20);

  return useQuery({
    // Updated dependency array to match the new zoneData.is_serviceable flag
    queryKey: ['homeData', currentLocation?.lat, currentLocation?.lng, zoneData?.is_serviceable, driversData?.total_count],
    queryFn: async (): Promise<HomeData> => {
      
      // Look for the correct flag from our updated useServiceZone hook
      const isServiceable = zoneData?.is_serviceable ?? true;

      if (!isServiceable) {
        return { is_serviceable: false, quickRoutes: [], vehicles: [], nearbyDriverCount: 0 };
      }

      return {
        is_serviceable: true,
        quickRoutes: QUICK_ROUTES,
        vehicles: [
          { id: 'bike',        label: 'Bike',        price: 80,   tag: 'CHEAPEST', tagStyle: 'primary' },
          { id: 'auto',        label: 'Auto',        price: 320,  tag: '4 SEATS',  tagStyle: 'faint'   },
          { id: 'shared_auto', label: 'Shared Auto', price: 70,   tag: 'PER SEAT', tagStyle: 'muted'   },
        ],
        nearbyDriverCount: driversData?.total_count ?? 0, // Successfully wired to real backend!
      };
    },
    enabled: true,
  });
}