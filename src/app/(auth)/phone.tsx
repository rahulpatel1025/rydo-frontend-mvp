// src/app/(auth)/phone.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UserAuthAPI } from '@/features/auth/api/userAuthAPI'; // Ensure this path matches your setup
import { themeConfig } from '../../theme'; // Import your theme dictionary

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Grab the active theme
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  const handleContinue = async () => {
    if (phone.length !== 10) return;

    setIsLoading(true);
    try {
      // Trigger the real Axios call to your intern's /send-otp endpoint!
      await UserAuthAPI.sendOtp(phone);
      
      // Navigate to verify screen, passing JUST the 10 digits 
      // (The API expects the country code and phone separated or handles it natively)
      router.push({ 
        pathname: '/(auth)/verify', 
        params: { phone } 
      });
    } catch (error: any) {
      // Catch backend errors (like rate limits) and show a clean alert
      const errorMsg = error.response?.data?.message || "Failed to send OTP. Please try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
          
          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 }}>
            What's your number?
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 8, lineHeight: 20 }}>
            We'll send you a 6-digit verification code to secure your account.
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, borderBottomWidth: 2, borderBottomColor: phone.length === 10 ? theme.accent : theme.border, paddingBottom: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', marginRight: 10 }}>
              +91
            </Text>
            <TextInput
              style={{ flex: 1, fontSize: 26, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', letterSpacing: 2 }}
              placeholder="000 000 0000"
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
              autoFocus
              editable={!isLoading}
            />
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            disabled={phone.length < 10 || isLoading}
            onPress={handleContinue}
            style={{
              backgroundColor: phone.length === 10 ? theme.accent : theme.accentSoft,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 20,
              opacity: isLoading ? 0.7 : 1, // Slight dim while loading
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: phone.length === 10 ? theme.background : theme.textSub, fontFamily: 'Outfit_800ExtraBold' }}>
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}