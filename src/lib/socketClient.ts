import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { NGROK_URL } from './apiClient';

let socket: Socket | null = null;

export const getSocket = () => socket;

export const connectSocket = async (): Promise<Socket> => {
  // ✅ FIX: If socket exists but is disconnected (e.g. after a network drop),
  // tear it down and create a fresh one rather than returning a dead socket.
  if (socket?.connected) return socket;
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = await SecureStore.getItemAsync('userToken');
  if (!token) throw new Error('No user token found. Cannot authenticate socket.');

  socket = io(NGROK_URL, {
    transports: ['websocket'],
    auth: { token },
    // ✅ FIX: Reconnection settings. The default is fine but being explicit
    // prevents silent failures on mobile network switches (WiFi <-> cellular).
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () =>
    console.log('🟢 Rider WebSocket Connected:', socket?.id)
  );
  socket.on('connect_error', (err: any) =>
    console.error('🔴 Rider WebSocket Error:', err.message)
  );
  socket.on('disconnect', (reason) =>
    console.log('⭕ Rider WebSocket Disconnected. Reason:', reason)
  );

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};