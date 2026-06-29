import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type TripStatus = 'completed' | 'cancelled';
export type Trip = {
  id: number;
  from: string;
  to: string;
  date: string;
  driver: string;
  km: number;
  fare: number;
  status: TripStatus;
  vehicle: 'bike' | 'auto';
};

export function useTripHistory() {
  return useQuery({
    queryKey: ['tripHistory'],
    queryFn: async (): Promise<Trip[]> => {
      const res = await apiClient.get('/users/rides/history');
      const backendRides = res.data?.data?.rides || [];
      
      return backendRides.map((ride: any) => ({
        id: parseInt(ride.id, 10) || 0,
        from: ride.route?.from || 'Unknown Location',
        to: ride.route?.to || 'Unknown Location',
        date: ride.completed_at ? new Date(ride.completed_at).toLocaleDateString() : 'Unknown Date',
        driver: ride.driver?.name || 'Unknown Driver',
        km: ride.route?.distance_km || 0,
        fare: ride.fare?.total || ride.fare || 0,
        status: ride.status === 'completed' ? 'completed' : 'cancelled',
        vehicle: ride.vehicle?.toLowerCase().includes('auto') ? 'auto' : 'bike',
      }));
    }
  });
}