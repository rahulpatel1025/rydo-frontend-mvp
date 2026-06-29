// src/features/booking/api/useBookRide.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import { connectSocket } from '../../../lib/socketClient';

// This interface matches your intern's Zod schema perfectly
interface BookRidePayload {
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  pickup_address?: string;
  drop_address?: string;
  is_rideshare?: boolean;
  vehicle_type?: "bike" | "auto" | "cab_economy" | "cab_premium";
  payment_method?: "cash" | "upi" | "card" | "wallet";
}

export function useBookRide() {
  // 1. Initialize the query client
  const queryClient = useQueryClient(); 

  return useMutation({
    mutationFn: async (payload: BookRidePayload) => {
      const response = await apiClient.post('/users/rides/bookride', payload);
      return response.data; // Usually contains the new ride ID and status
    },
    onSuccess: async (data) => {
      console.log("✅ Ride successfully booked!", data);
      
      // 2. ✨ THE FIX: Force React Query to fetch the new ride data immediately!
      queryClient.invalidateQueries({ queryKey: ['activeRide'] });
      
      try {
        // Connect to the socket immediately upon booking
        const socket = await connectSocket();
        
        // Extract the new ride ID (Adjust 'data.id' if your backend nests it, e.g., 'data.data.id')
       const newRideId = data?.data?.ride_id || data?.ride_id;
        
        if (newRideId) {
          socket.emit('rider:join-ride', { ride_id: newRideId });
          console.log(`🔌 Emitted join room request for Ride: ${newRideId}`);
        } else {
          console.warn("⚠️ Ride ID missing from response data. Could not join socket room.");
        }
      } catch (error) {
        console.error("🔴 Failed to connect to ride socket:", error);
      }
    },
    onError: (error: any) => {
      console.log("========== BOOK RIDE ERROR ==========");
      console.log("Status:", error?.response?.status);
      console.log("Status Text:", error?.response?.statusText);

      console.log("Backend Response:");
      console.log(
        JSON.stringify(error?.response?.data, null, 2)
      );

      console.log("Request Payload:");
      console.log(
        JSON.stringify(error?.config?.data, null, 2)
      );

      console.log("Full Error:");
      console.log(error);

      console.log("=====================================");
    }
  });
}