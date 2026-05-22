// src/features/auth/api/userAuthAPI.ts
import { NGROK_URL } from '@/lib/apiClient';
import axios from 'axios';
import { Platform } from 'react-native';

// Uses the same ngrok URL as apiClient but without /api prefix for auth routes
const authClient = axios.create({
  baseURL: `${NGROK_URL}/api/users/auth`,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export const UserAuthAPI = {
  sendOtp: async (phone: string, countryCode: string = '+91') => {
    const response = await authClient.post('/send-otp', {
      phone,
      country_code: countryCode,
    });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string) => {
    const response = await authClient.post('/verify-otp', {
      phone,
      otp,
      device_token: Platform.OS === 'ios' ? 'ios-mock-token' : 'android-mock-token',
    });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await authClient.post('/register', userData);
    return response.data;
  },
};