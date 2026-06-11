// src/lib/socketClient.ts
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { NGROK_URL } from './apiClient';

let socket: Socket | null = null;

export const getSocket = () => socket;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('userToken');
  if (!token) throw new Error("No user token found. Cannot authenticate socket.");

  socket = io(NGROK_URL, {
    transports: ['websocket'],
    auth: { token },
  });
  

  socket.on('connect', () => console.log('🟢 Rider WebSocket Connected:', socket?.id));
  socket.on('connect_error', (err: any) => console.error('🔴 Rider WebSocket Error:', err.message));
  socket.on('disconnect', () => console.log('⭕ Rider WebSocket Disconnected'));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};