// src/lib/apiClient.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Update this whenever ngrok restarts ──────────────────────────────────────
export const NGROK_URL = 'https://caddy-kinsman-reanalyze.ngrok-free.dev';

export const apiClient = axios.create({
  baseURL: `${NGROK_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ── Attach JWT token to every request automatically ───────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Handle 401 — token expired ────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
    return Promise.reject(error);
  }
);