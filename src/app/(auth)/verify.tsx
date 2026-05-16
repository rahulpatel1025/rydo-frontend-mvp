// src/app/(auth)/verify.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function VerifyOtpScreen() {
  const router = useRouter();
  // Grab the phone number passed from the previous screen
  const { phone } = useLocalSearchParams();
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    // TODO (Week 2): Trigger Axios call to intern's /verify-otp endpoint.
    // If it returns a 200 OK + JWT Token, we route the user to the main app.
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
          
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -1 }}>
            Enter the code
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular', marginTop: 8, lineHeight: 20 }}>
            Sent to {phone || '+91 0000000000'}
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
            />
          </View>

          <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#BEFF00', fontFamily: 'Outfit_600SemiBold' }}>Resend Code</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            disabled={otp.length < 6}
            onPress={handleVerify}
            style={{
              backgroundColor: otp.length === 6 ? '#BEFF00' : 'rgba(190,255,0,0.1)',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: otp.length === 6 ? '#060A07' : 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_800ExtraBold' }}>
              Verify & Login
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}