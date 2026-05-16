// src/app/(tabs)/book.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Path } from 'react-native-svg';

// 1. Import our new hook
import { useFareEstimate, VehicleType } from '../../features/booking/api/useFareEstimate';

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={16} height={12} viewBox="0 0 16 12" fill="none">
    <Path d="M14 6H2M2 6L7 1M2 6L7 11" stroke="rgba(255,255,255,0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SwapIcon = () => (
  <Svg width={13} height={14} viewBox="0 0 13 14" fill="none">
    <Path d="M3 1.5V12.5M3 12.5L1 10.5M3 12.5L5 10.5M10 12.5V1.5M10 1.5L8 3.5M10 1.5L12 3.5" stroke="rgba(190,255,0,0.7)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function BookScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<VehicleType>('bike');
  
  // 2. Fetch the dynamic fare data from the mock backend
  const { data, isLoading } = useFareEstimate();

  const vehicles: { id: VehicleType; label: string; icon: string }[] = [
    { id: 'bike', label: 'Bike', icon: '🛵' },
    { id: 'auto', label: 'Auto', icon: '🛺' },
    { id: 'shared_auto', label: 'Share Auto', icon: '🚐' },
  ];

  // 3. Handle Loading State safely
  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  const activeFare = data.fares[selected];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, backgroundColor: '#101C12', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>
            Plan your ride
          </Text>
        </View>

        {/* ── Location Card ── */}
        <View style={{ marginHorizontal: 14, backgroundColor: '#101C12', borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#BEFF00' }} />
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_400Regular' }}>FROM</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', marginTop: 2 }}>{data.route.from}</Text>
            </View>
          </View>
          <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5050' }} />
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_400Regular' }}>TO</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', marginTop: 2 }}>{data.route.to}</Text>
            </View>
          </View>
          {/* Swap button */}
          <TouchableOpacity style={{ position: 'absolute', right: 13, top: '50%', marginTop: -15, width: 30, height: 30, backgroundColor: '#182018', borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.15)' }}>
            <SwapIcon />
          </TouchableOpacity>
        </View>

        {/* ── Route Info ── */}
        <View style={{ marginHorizontal: 14, marginTop: 9, backgroundColor: '#101C12', borderRadius: 13, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', padding: 13, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { value: `${data.distance_km} km`, label: 'Distance' }, 
            { value: `~${data.duration_minutes} min`, label: 'Est. time' }, 
            { value: 'UPI', label: 'Payment' }
          ].map((item, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 }}>{item.value}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={{ width: 0.5, height: 30, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
            </View>
          ))}
        </View>

        {/* ── Vehicle Selector ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: -0.2 }}>Choose vehicle</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 7 }}>
          {vehicles.map((v) => {
            const active = selected === v.id;
            const price = data.fares[v.id].total;
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelected(v.id)}
                style={{ backgroundColor: active ? 'rgba(190,255,0,0.08)' : '#101C12', borderWidth: 0.5, borderColor: active ? 'rgba(190,255,0,0.4)' : 'rgba(255,255,255,0.08)', borderRadius: 15, padding: 12, alignItems: 'center', gap: 5, minWidth: 82 }}
              >
                <Text style={{ fontSize: 20 }}>{v.icon}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' }}>{v.label}</Text>
                <Text style={{ fontSize: 11, color: active ? '#BEFF00' : 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>₹{price}{v.id === 'shared_auto' ? '/seat' : ''}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Fare Breakdown ── */}
        <View style={{ marginHorizontal: 14, marginTop: 12, backgroundColor: '#101C12', borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: 14 }}>
          {[
            { label: 'Base fare', value: `₹${activeFare.base}` },
            { 
              label: selected === 'shared_auto' ? 'Fixed route price' : `Distance (${data.distance_km} km × ₹${activeFare.distRate})`, 
              value: selected === 'shared_auto' ? '—' : `₹${activeFare.dist}` 
            },
            { label: 'Platform fee', value: `₹${activeFare.platform}` },
            { label: 'GST (5%)', value: `₹${activeFare.gst}` },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>{row.label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 11, marginTop: 7, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>Total</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.5 }}>₹{activeFare.total}</Text>
          </View>
        </View>

        {/* ── Confirm Button ── */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/track')}
          style={{ marginHorizontal: 14, marginTop: 11, marginBottom: 24, backgroundColor: '#BEFF00', borderRadius: 17, paddingVertical: 17, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#060A07', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 }}>Confirm Ride</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}