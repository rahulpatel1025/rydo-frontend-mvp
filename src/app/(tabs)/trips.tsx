// src/app/(tabs)/trips.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle, Path, Rect } from 'react-native-svg';

// 1. Import our custom hook
import { useTripHistory } from '../../features/wallet/useTripHistory';

type Filter = 'All' | 'Completed' | 'Cancelled';

const BikeSmall = ({ color = '#BEFF00' }: { color?: string }) => (
  <Svg width={20} height={16} viewBox="0 0 40 28" fill="none">
    <Circle cx={8} cy={22} r={6} stroke={color} strokeWidth={2} />
    <Circle cx={32} cy={22} r={6} stroke={color} strokeWidth={2} />
    <Path d="M8 22L16 8L24 14L30 8L32 22" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
  </Svg>
);

const AutoSmall = ({ color = 'rgba(255,255,255,0.45)' }: { color?: string }) => (
  <Svg width={20} height={16} viewBox="0 0 40 28" fill="none">
    <Rect x={8} y={8} width={22} height={14} rx={4} stroke={color} strokeWidth={1.8} />
    <Circle cx={12} cy={22} r={4} stroke={color} strokeWidth={1.8} />
    <Circle cx={28} cy={22} r={4} stroke={color} strokeWidth={1.8} />
  </Svg>
);

export default function TripsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  
  // 2. Fetch the data
  const { data: trips = [], isLoading } = useTripHistory();

  // 3. Handle loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  // 4. Filter the data coming from the hook
  const filtered = trips.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Completed') return t.status === 'completed';
    return t.status === 'cancelled';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>Your Trips</Text>
        </View>

        {/* ── Filter Tabs ── */}
        <View style={{ flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
          {(['All', 'Completed', 'Cancelled'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{ backgroundColor: active ? 'rgba(190,255,0,0.1)' : '#101C12', borderWidth: 0.5, borderColor: active ? 'rgba(190,255,0,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#BEFF00' : 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_700Bold' }}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Trip List ── */}
        {filtered.map((trip, i) => (
          <TouchableOpacity
            key={trip.id}
            style={{ paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: i < filtered.length - 1 ? 0.5 : 0, borderBottomColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', gap: 11, alignItems: 'center' }}
          >
            {/* Vehicle Icon */}
            <View style={{ width: 40, height: 40, backgroundColor: '#101C12', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
              {trip.vehicle === 'bike'
                ? <BikeSmall color={trip.status === 'cancelled' ? 'rgba(255,80,80,0.5)' : '#BEFF00'} />
                : <AutoSmall color={trip.status === 'cancelled' ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.45)'} />
              }
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: -0.1 }}>
                {trip.from} → {trip.to}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', marginTop: 3 }}>
                {trip.date} · {trip.driver} · {trip.km} km
              </Text>
            </View>

            {/* Amount + Status */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold' }}>
                {trip.fare > 0 ? `₹${trip.fare}` : '₹0'}
              </Text>
              <View style={{ marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: trip.status === 'completed' ? 'rgba(190,255,0,0.1)' : 'rgba(255,80,80,0.1)' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: trip.status === 'completed' ? '#BEFF00' : '#FF8080', fontFamily: 'Outfit_700Bold' }}>
                  {trip.status === 'completed' ? 'Done' : 'Cancelled'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}