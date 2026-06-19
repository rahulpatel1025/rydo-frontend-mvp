import { useEffect } from 'react';
import { useColorScheme } from 'react-native'; // 1. Import the hook
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
import { AuthProvider, useAuth } from '../lib/auth-context';
import { themeConfig } from '../theme'; // 2. Import your theme dictionary
import "../../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// This component handles the redirection logic
function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 3. Grab the active theme for the Stack backgrounds
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

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
    // 4. Inject the dynamic background color here
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
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

  // 5. Grab the theme again for the StatusBar
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {/* 6. Make the status bar icons auto-flip (dark icons on light mode, light icons on dark mode) */}
        <StatusBar 
          style={colorScheme === 'dark' ? 'light' : 'dark'} 
          backgroundColor={theme.background} 
        />
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}