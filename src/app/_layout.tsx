import { useEffect } from 'react';
import { Stack, useRouter, useSegments, Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context'; // Ensure this path is correct
import "../../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// This component handles the redirection logic
function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // If not logged in and not already in (auth), send to login
      router.replace('/(auth)/phone' as any); 
    } else if (session && inAuthGroup) {
      // If logged in and in (auth), send to home
      router.replace('/(tabs)/' as any); 
    }
  }, [session, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#06090A' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="intro" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#06090A" />
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}