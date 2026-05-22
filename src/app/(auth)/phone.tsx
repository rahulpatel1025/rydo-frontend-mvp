// src/app/(auth)/phone.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UserAuthAPI } from '@/features/auth/api/userAuthAPI'; // Ensure this path matches your setup

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
          
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 }}>
            What's your number?
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular', marginTop: 8, lineHeight: 20 }}>
            We'll send you a 6-digit verification code to secure your account.
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, borderBottomWidth: 2, borderBottomColor: phone.length === 10 ? '#BEFF00' : 'rgba(190,255,0,0.3)', paddingBottom: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', marginRight: 10 }}>
              +91
            </Text>
            <TextInput
              style={{ flex: 1, fontSize: 26, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: 2 }}
              placeholder="000 000 0000"
              placeholderTextColor="rgba(255,255,255,0.15)"
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
              backgroundColor: phone.length === 10 ? '#BEFF00' : 'rgba(190,255,0,0.1)',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 20,
              opacity: isLoading ? 0.7 : 1, // Slight dim while loading
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: phone.length === 10 ? '#060A07' : 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_800ExtraBold' }}>
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}