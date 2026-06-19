import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

export type PassengerStatus =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'BOARDED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ActiveRideData {
  id: string;
  status: PassengerStatus;
  status_text: string;
  eta_minutes: number;
  is_rideshare: boolean;
  detour_km?: number;
  otp?: string;
  pickup: {
    location: { lat: number; lng: number };
  };
  route: {
    from: string;
    to: string;
    distance_km: number;
    coords: { latitude: number; longitude: number }[];
  };
  vehicle: string;
  fare: number;
  driver: {
    initials: string;
    name: string;
    rating: number;
    trips: number;
    plate: string;
    on_time_pct: number;
  };
}

export function useActiveRide() {
  return useQuery({
    queryKey: ['activeRide'],
    queryFn: async (): Promise<ActiveRideData | null> => {
      try {
        const res = await apiClient.get('/users/rides/current');
        return res.data?.data || res.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    // ✅ FIX: Poll every 8 seconds as a fallback safety net.
    // If a socket event is missed, the UI self-corrects within 8s.
    refetchInterval: 8000,
    // ✅ FIX: Don't serve stale data. Always re-fetch on focus/mount.
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}