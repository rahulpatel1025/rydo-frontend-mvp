// src/app/(tabs)/trips.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle, Path, Rect } from 'react-native-svg';

import { useTripHistory } from '../../features/wallet/useTripHistory';
import { themeConfig } from '../../theme'; // Import your theme dictionary

type Filter = 'All' | 'Completed' | 'Cancelled';

// ── Icons ─────────────────────────────────────────────────────────────────────
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
  
  // Fetch raw backend Ride data
  const { data: rawTrips = [], isLoading } = useTripHistory();

  // ── Theme Hook ──
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  // ── Multi-Tenant Data Extractor ──
  const mappedTrips = rawTrips.map((trip: any) => {
    const myPassengerRecord = trip.ride_passengers?.[0] || {};
    
    return {
      id: trip.id,
      status: myPassengerRecord.status?.toLowerCase() || trip.status?.toLowerCase() || 'completed',
      from: myPassengerRecord.pickup?.address?.split(',')[0] || trip.origin?.address?.split(',')[0] || 'Unknown',
      to: myPassengerRecord.drop?.address?.split(',')[0] || trip.destination?.address?.split(',')[0] || 'Unknown',
      fare: myPassengerRecord.fare?.fare_total || 0,
      km: myPassengerRecord.segment_distance_km || trip.total_distance_km || 0,
      driver: trip.captain?.name || 'Searching...',
      vehicleType: trip.captain?.vehicle?.vehicle_type?.toLowerCase() || (trip.is_rideshare ? 'auto' : 'bike'),
      isShared: trip.is_rideshare || false,
      date: new Date(trip.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    };
  });

  const filtered = mappedTrips.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Completed') return t.status === 'completed';
    return t.status === 'cancelled';
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>Your Trips</Text>
        </View>

        {/* ── Filter Tabs ── */}
        <View style={{ flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
          {(['All', 'Completed', 'Cancelled'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{ 
                  backgroundColor: active ? theme.accentSoft : theme.card, 
                  borderWidth: 0.5, 
                  borderColor: active ? theme.accent : theme.border, 
                  borderRadius: 18, 
                  paddingHorizontal: 13, 
                  paddingVertical: 7 
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? theme.accent : theme.textSub, fontFamily: 'Outfit_700Bold' }}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Trip List ── */}
        {filtered.map((trip, i) => (
          <TouchableOpacity
            key={trip.id}
            style={{ 
              paddingHorizontal: 14, 
              paddingVertical: 13, 
              borderBottomWidth: i < filtered.length - 1 ? 0.5 : 0, 
              borderBottomColor: theme.border, 
              flexDirection: 'row', 
              gap: 11, 
              alignItems: 'center' 
            }}
          >
            {/* Vehicle Icon */}
            <View style={{ width: 40, height: 40, backgroundColor: theme.card, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
              {trip.vehicleType === 'bike'
                ? <BikeSmall color={trip.status === 'cancelled' ? '#FF453A' : theme.accent} />
                : <AutoSmall color={trip.status === 'cancelled' ? '#FF453A' : theme.textSub} />
              }
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', letterSpacing: -0.1 }}>
                {trip.from} → {trip.to}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Text style={{ fontSize: 10, color: theme.textSub, fontFamily: 'Outfit_400Regular' }}>
                  {trip.date} · {trip.driver} · {trip.km} km
                </Text>
                {trip.isShared && (
                  <View style={{ backgroundColor: theme.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginLeft: 6 }}>
                    <Text style={{ fontSize: 8, color: theme.textSub, fontFamily: 'Outfit_700Bold' }}>SHARED</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Amount + Status */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold' }}>
                {trip.fare > 0 ? `₹${trip.fare}` : '₹0'}
              </Text>
              <View style={{ 
                marginTop: 4, 
                paddingHorizontal: 7, 
                paddingVertical: 3, 
                borderRadius: 5, 
                backgroundColor: trip.status === 'completed' ? theme.accentSoft : 'rgba(255, 69, 58, 0.1)' 
              }}>
                <Text style={{ 
                  fontSize: 9, 
                  fontWeight: '700', 
                  color: trip.status === 'completed' ? theme.accent : '#FF453A', 
                  fontFamily: 'Outfit_700Bold' 
                }}>
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