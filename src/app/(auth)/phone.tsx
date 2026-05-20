// src/app/(auth)/phone.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const handleContinue = () => {
    // TODO (Week 2): Trigger Axios call to intern's /send-otp endpoint here.
    // For now, we simulate success and pass the phone number to the verify screen.
    router.push({ 
      pathname: '/(auth)/verify', 
      params: { phone: `+91 ${phone}` } 
    });
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
            />
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            disabled={phone.length < 10}
            onPress={handleContinue}
            style={{
              backgroundColor: phone.length === 10 ? '#BEFF00' : 'rgba(190,255,0,0.1)',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: phone.length === 10 ? '#060A07' : 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_800ExtraBold' }}>
              Continue
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}