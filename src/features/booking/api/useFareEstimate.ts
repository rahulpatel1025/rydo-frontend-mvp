import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

export type VehicleType =
  | 'bike'
  | 'auto'
  | 'shared_auto';

export interface FareDetails {
  base: number;
  perKmRate: number;
  distFare: number;
  timeFare?: number;
  waitingFare: number;
  nightSurcharge: number;
  platformFee: number;
  tds: number;
  grossFare: number;
  total: number;
  standardTotal?: number;
  isLaunchRate?: boolean;
  sharedPerKmRate?: number;
  chargeableKm: number;
}

export interface FareEstimateResponse {
  distance_km: number;
  duration_minutes: number;
  fares: Record<string, FareDetails>;
}

export function useFareEstimate(
  pickup?: { lat: number; lng: number; address?: string },
  drop?: { lat: number; lng: number; address?: string }
) {
  return useQuery({
    queryKey: [
      'fareEstimate',
      pickup?.lat,
      pickup?.lng,
      drop?.lat,
      drop?.lng,
    ],

    queryFn: async (): Promise<FareEstimateResponse | null> => {
      if (!pickup?.lat || !drop?.lat) {
        return null;
      }

      const res = await apiClient.post(
        '/users/rides/fareestimate',
        {
          pickup: {
            lat: pickup.lat,
            lng: pickup.lng,
          },
          drop: {
            lat: drop.lat,
            lng: drop.lng,
          },
        }
      );

      console.log(
        '============== FARE RESPONSE =============='
      );
      console.log(
        JSON.stringify(res.data, null, 2)
      );
      console.log(
        '==========================================='
      );

      const payload =
        res.data?.data || res.data;

      const fares: Record<
        string,
        FareDetails
      > = {};

      (payload.estimates || []).forEach(
        (estimate: any) => {
          let key =
            estimate.ride_type.toLowerCase();

          if (
            key === 'auto' &&
            estimate.is_rideshare
          ) {
            key = 'shared_auto';
          }

          fares[key] = {
            base:
              estimate.fare.fare_base,
            perKmRate:
              estimate.fare
                .fare_per_km_rate,
            sharedPerKmRate:
              estimate.fare
                .fare_shared_per_km,
            distFare:
              estimate.fare
                .fare_distance_charge,
            waitingFare:
              estimate.fare
                .fare_waiting_charge,
            nightSurcharge:
              estimate.fare
                .fare_night_surcharge,
            platformFee:
              estimate.fare
                .fare_platform_fee,
            total:
              estimate.fare
                .fare_total,

            // temporary values to match existing UI
            standardTotal:
              estimate.fare
                .fare_total,
            isLaunchRate:
              estimate.fare
                .is_launch_rate,
            chargeableKm: Math.max(
              0,
              payload.distance_km -
                estimate.fare
                  .fare_included_km
            ),
            tds: 0,
            grossFare:
              estimate.fare
                .fare_total,
          };
        }
      );

      console.log(
        'NORMALIZED FARES:',
        JSON.stringify(fares, null, 2)
      );

      return {
        distance_km:
          payload.distance_km,
        duration_minutes:
          payload.duration_minutes,
        fares,
      };
    },

    enabled: !!(
      pickup?.lat &&
      drop?.lat
    ),

    retry: false,

    staleTime: 30000,
  });
}