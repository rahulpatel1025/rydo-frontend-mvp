// src/features/booking/api/useActiveRide.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

// ── Aligning with the PassengerStatus enum from your backend ──
export type PassengerStatus = 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'BOARDED' | 'COMPLETED' | 'CANCELLED';

export interface ActiveRideData {
  id: string;
  status: PassengerStatus;
  status_text: string;
  eta_minutes: number;
  
  // ── Multi-Tenant Fields ──
  is_rideshare: boolean;
  detour_km?: number;
  otp?: string;

  route: {
    from: string;
    to: string;
    distance_km: number;
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
        // Ping the backend to get the user's current active passenger container
        const res = await apiClient.get('/users/rides/current');
        
        // Return the payload exactly as the backend formatted it
        return res.data?.data || res.data;
      } catch (error: any) {
        // If the backend says 404, it just means they aren't on a ride right now. 
        // Don't crash, just return null.
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }, 
  });
}