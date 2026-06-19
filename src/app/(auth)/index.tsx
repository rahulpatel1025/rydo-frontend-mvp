// src/app/(auth)/index.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Path } from 'react-native-svg';
import { useColorScheme } from 'react-native'; // 1. Import Hook
import { themeConfig } from '../../theme'; // 2. Import Theme

// ── Icons ─────────────────────────────────────────────────────────────────
// Pass a dynamic fill color prop to the Apple Icon
const AppleIcon = ({ fill }: { fill: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={fill}>
    <Path d="M16.365 21.43c-1.355 1.01-2.695 1.05-3.92.05-1.29-.98-2.58-.96-3.99.04-1.42 1.01-2.63 1.04-3.72-.1-1.07-1.11-2.42-3.8-2.42-7.39 0-3.32 1.48-5.74 3.79-6.9 1.25-.62 2.65-.67 3.9-.12 1.22.54 2.11.58 3.32.05 1.4-.6 2.87-.52 4.1.28 1.43.93 2.37 2.66 2.37 4.54-2.22-.05-3.69 1.34-3.69 3.5 0 2.22 1.5 3.52 3.65 3.56-.63 1.35-1.63 2.82-3.37 4.49zm-4.14-16.14c-.66.82-1.74 1.36-2.86 1.27-.14-1.2.4-2.39 1.1-3.21.68-.8 1.8-1.37 2.86-1.27.15 1.22-.4 2.4-1.1 3.21z" />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function WelcomeScreen() {
  const router = useRouter();
  
  // 3. Grab the active theme
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  const handleOAuthLogin = (provider: 'apple' | 'google') => {
    router.push('/(auth)/phone');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        
        {/* ── Hero Section ── */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 42, fontWeight: '900', color: theme.accent, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1.5 }}>
            RYDO
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', marginTop: 12, letterSpacing: -0.5 }}>
            Your city, unlocked.
          </Text>
          <Text style={{ fontSize: 15, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 8, lineHeight: 22 }}>
            Book bikes, autos, and cabs in seconds. Reliable rides at your fingertips.
          </Text>
        </View>

        {/* ── Auth Buttons ── */}
        <View style={{ paddingBottom: 20 }}>
          
          <TouchableOpacity
            onPress={() => handleOAuthLogin('apple')}
            // Apple Button magically inverts itself!
            style={{ backgroundColor: theme.text, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
          >
            <AppleIcon fill={theme.background} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.background, fontFamily: 'Outfit_700Bold', marginLeft: 10 }}>
              Continue with Apple
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuthLogin('google')}
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
          >
            <GoogleIcon />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', marginLeft: 10 }}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <Text style={{ marginHorizontal: 16, fontSize: 12, color: theme.textSub, fontFamily: 'Outfit_500Medium' }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            style={{ backgroundColor: theme.accentSoft, borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accent, fontFamily: 'Outfit_700Bold' }}>
              Continue with Phone Number
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, color: theme.textSub, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginTop: 24, lineHeight: 16 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

        </View>
      </View>
    </SafeAreaView>
  );
}