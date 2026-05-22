// src/app/(auth)/verify.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { UserAuthAPI } from '@/features/auth/api/userAuthAPI';
import { useAuth } from '@/lib/auth-context';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { signIn } = useAuth(); // Add this hook
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return;

    setIsVerifying(true);
    try {
      const rawPhone = Array.isArray(phone) ? phone[0] : (phone as string ?? '');
      const phoneNumber = rawPhone.trim().replace(/\s/g, '');

      const response = await UserAuthAPI.verifyOtp(phoneNumber, otp);
      
      // Extract token from response data
      const token = response.token;

      // This will now trigger the RootLayout to automatically 
      // redirect you to the home screen!
      signIn(token);

    } catch (error: any) {
      console.log('[Verify] Error:', JSON.stringify(error?.response?.data ?? error?.message));
      const errorMsg = error.response?.data?.message || "Invalid OTP. Please try again.";
      Alert.alert("Verification Failed", errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      const rawPhone = Array.isArray(phone) ? phone[0] : (phone as string ?? '');
      const phoneNumber = rawPhone.trim().replace(/\s/g, '');
      await UserAuthAPI.sendOtp(phoneNumber);
      Alert.alert("OTP Sent", "A new OTP has been sent.");
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to resend OTP.";
      Alert.alert("Error", errorMsg);
    }
  };

  const displayPhone = Array.isArray(phone) ? phone[0] : (phone ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>

          <Text style={{ fontSize: 28, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 }}>
            Enter the code
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular', marginTop: 8, lineHeight: 20 }}>
            Sent to +91 {displayPhone}
          </Text>

          <View style={{ marginTop: 40, borderBottomWidth: 2, borderBottomColor: otp.length === 6 ? '#BEFF00' : 'rgba(190,255,0,0.3)', paddingBottom: 10 }}>
            <TextInput
              style={{ fontSize: 32, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: 14, textAlign: 'center' }}
              placeholder="000000"
              placeholderTextColor="rgba(255,255,255,0.15)"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
              autoFocus
              editable={!isVerifying}
            />
          </View>

          <TouchableOpacity
            style={{ marginTop: 24, alignItems: 'center' }}
            disabled={isVerifying}
            onPress={handleResend}
          >
            <Text style={{ fontSize: 13, color: isVerifying ? 'rgba(190,255,0,0.5)' : '#BEFF00', fontFamily: 'Outfit_600SemiBold' }}>
              Resend Code
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            disabled={otp.length < 6 || isVerifying}
            onPress={handleVerify}
            style={{
              backgroundColor: otp.length === 6 ? '#BEFF00' : 'rgba(190,255,0,0.1)',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 20,
              opacity: isVerifying ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: otp.length === 6 ? '#060A07' : 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_800ExtraBold' }}>
              {isVerifying ? 'Verifying...' : 'Verify & Login'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}