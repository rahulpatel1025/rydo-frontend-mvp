// src/features/auth/api/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      // TODO: Replace with apiClient.get('/users/profile')
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        initials: 'R',
        name: 'Rahul Patel',
        phone: '+91 98765 43210',
        tier: 'Gold Member',
        stats: {
          total_rides: 48,
          km_covered: 914,
          saved_inr: 360
        }
      };
    },
  });
}