// src/features/wallet/useTripHistory.ts
import { useQuery } from '@tanstack/react-query';

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
      // TODO: Replace with apiClient.get('/users/rides/history')
      await new Promise(resolve => setTimeout(resolve, 600));

      return [
        { id: 1, from: 'Silvassa', to: 'Vapi', date: 'Today · 2:15 PM', driver: 'Ramesh K.', km: 22, fare: 56, status: 'completed', vehicle: 'bike' },
        { id: 2, from: 'Vapi', to: 'Daman', date: 'Yesterday · 10:30 AM', driver: 'Suresh M.', km: 18, fare: 72, status: 'completed', vehicle: 'auto' },
        { id: 3, from: 'Daman', to: 'Silvassa', date: 'Apr 22 · 5:00 PM', driver: 'Cancelled by user', km: 32, fare: 0, status: 'cancelled', vehicle: 'auto' },
        { id: 4, from: 'Bhilad', to: 'Silvassa', date: 'Apr 21 · 9:10 AM', driver: 'Vijay P.', km: 14, fare: 36, status: 'completed', vehicle: 'bike' },
      ];
    }
  });
}