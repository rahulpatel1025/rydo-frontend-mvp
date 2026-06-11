import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface NearbyDriver {
  driver_id: number;
  latitude: number;
  longitude: number;
  ride_type: 'BIKE' | 'AUTO' | 'SHARED_AUTO';

  account_id?: number;
  name?: string;
  phone?: string;
  rating?: number;
  distance_km?: number;

  vehicle_info?: {
    type: string;
    number: string;
  };
}

export interface NearbyDriversResult {
  nearby_drivers: NearbyDriver[];
  total_count: number;
}

export function useNearbyDrivers(
  coords?: { lat: number; lng: number },
  radiusKm: number = 3,
  limit: number = 10
) {
  return useQuery({
    queryKey: [
      'nearbyDrivers',
      coords?.lat,
      coords?.lng,
      radiusKm,
      limit,
    ],

    queryFn: async (): Promise<NearbyDriversResult> => {
      try {
        const res = await apiClient.get('/drivers/nearby', {
          params: {
            lat: coords!.lat,
            lng: coords!.lng,
            radius_km: radiusKm,
            limit,
          },
        });

        const payload = res.data?.data ?? res.data;

        const rawDrivers = payload?.nearby_drivers ??
          (Array.isArray(payload) ? payload : []);

        const normalizedDrivers: NearbyDriver[] = rawDrivers
          .map((driver: any) => {
            const latitude =
              driver.latitude ??
              driver.location?.lat;

            const longitude =
              driver.longitude ??
              driver.location?.lng;

            const driverId =
              driver.driver_id ??
              driver.id ??
              driver.account_id;

            if (
              driverId == null ||
              latitude == null ||
              longitude == null
            ) {
              return null;
            }

            return {
              driver_id: Number(driverId),
              latitude: Number(latitude),
              longitude: Number(longitude),
              ride_type:
                driver.ride_type ??
                driver.vehicle_info?.type?.toUpperCase() ??
                'BIKE',

              account_id:
                driver.account_id != null
                  ? Number(driver.account_id)
                  : undefined,

              name: driver.name,
              phone: driver.phone,
              rating:
                driver.rating != null
                  ? Number(driver.rating)
                  : undefined,

              distance_km:
                driver.distance_km != null
                  ? Number(driver.distance_km)
                  : undefined,

              vehicle_info: driver.vehicle_info,
            };
          })
          .filter(
            (driver: NearbyDriver | null): driver is NearbyDriver =>
              driver !== null
          );

        return {
          nearby_drivers: normalizedDrivers,
          total_count:
            payload?.total_count ??
            normalizedDrivers.length,
        };
      } catch (error) {
        console.warn(
          'Failed to fetch nearby drivers:',
          error
        );

        return {
          nearby_drivers: [],
          total_count: 0,
        };
      }
    },

    enabled:
      !!coords &&
      typeof coords.lat === 'number' &&
      typeof coords.lng === 'number',

    retry: false,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}