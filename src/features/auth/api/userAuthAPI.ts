import { NGROK_URL } from '@/lib/apiClient';
import axios from 'axios';
import { Platform } from 'react-native';

export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  profile_picture?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  date_of_birth?: string; // YYYY-MM-DD
  email_notification?: boolean;
}

// Uses the same ngrok URL as apiClient but explicitly for user auth routes
const authClient = axios.create({
  baseURL: `${NGROK_URL}/api/users/auth`,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export const UserAuthAPI = {
  // ── 1. Send OTP ──
  sendOtp: async (phone: string, countryCode: string = '+91') => {
    const response = await authClient.post('/send-otp', {
      phone,
      country_code: countryCode,
    });
    return response.data;
  },

  // ── 2. Verify OTP (Returns AuthResponse with is_new_user flag) ──
  verifyOtp: async (phone: string, otp: string) => {
    const response = await authClient.post('/verify-otp', {
      phone,
      otp,
      device_token: Platform.OS === 'ios' ? 'ios-mock-token' : 'android-mock-token',
    });
    return response.data;
  },

  // ── 3. Register New User (After OTP verification if is_new_user is true) ──
  register: async (userData: RegisterRequest) => {
    const response = await authClient.post('/register', userData);
    return response.data;
  },

  // ── 4. Explicit Login (Optional, usually verifyOtp handles standard login) ──
  login: async (phone: string, otp: string) => {
    const response = await authClient.post('/login', {
      phone,
      otp,
      device_token: Platform.OS === 'ios' ? 'ios-mock-token' : 'android-mock-token',
    });
    return response.data;
  },

  // ── 5. Refresh JWT Token ──
  refreshToken: async (refresh_token: string) => {
    const response = await authClient.post('/refresh-token', {
      refresh_token,
    });
    return response.data;
  },

  // ── 6. Logout ──
  logout: async (accessToken: string) => {
    const response = await authClient.post('/logout', 
      { device_token: Platform.OS === 'ios' ? 'ios-mock-token' : 'android-mock-token' },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  },

  // ── 7. Delete Account ──
  deleteAccount: async (accessToken: string) => {
    const response = await authClient.delete('/delete-account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
};