import { useQuery } from '@tanstack/react-query';

// ── Aligning with the PassengerStatus enum from your backend ──
export type PassengerStatus = 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'BOARDED' | 'COMPLETED' | 'CANCELLED';

export interface ActiveRideData {
  id: string;
  status: PassengerStatus;
  status_text: string;
  eta_minutes: number;
  
  // ── New Multi-Tenant Fields ──
  is_rideshare: boolean;
  detour_km?: number;
  otp?: string;
  // ─────────────────────────────

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
    queryFn: async (): Promise<ActiveRideData> => {
      // TODO (Week 3): Replace with actual apiClient.get('/users/rides/active')
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock data updated to include the new Rideshare fields so TypeScript stops yelling
      return {
        id: 'ride_9001',
        status: 'ACCEPTED', // Change this to 'BOARDED' to test how the UI adapts!
        status_text: 'Captain is on the way',
        eta_minutes: 4,
        
        // These fields control the new UI elements in track.tsx
        is_rideshare: true, 
        detour_km: 1.2,
        otp: '4729',        
        
        route: { 
          from: 'Silvassa', 
          to: 'Vapi', 
          distance_km: 22 
        },
        vehicle: 'Share Auto',
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
    // Poll the backend every 5 seconds to update the ETA and Status live
    refetchInterval: 5000, 
  });
}