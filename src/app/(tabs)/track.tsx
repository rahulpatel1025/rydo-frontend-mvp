// src/app/(tabs)/track.tsx
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Circle, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

// 1. Import our custom hook
import { useActiveRide } from '../../features/booking/api/useActiveRide';

// Note: In a real app, this map would be a react-native-maps component. 
// We are keeping the SVG placeholder for the MVP visual prototype.
const TrackMap = ({ eta, routeStr }: { eta: number, routeStr: string }) => (
  <Svg width="100%" height={195} viewBox="0 0 330 195">
    <Rect width={330} height={195} fill="#0C1610" />
    <Rect x={8} y={12} width={58} height={40} rx={4} fill="#0F1C12" />
    <Rect x={218} y={18} width={66} height={50} rx={4} fill="#0F1C12" />
    <Rect x={8} y={130} width={50} height={55} rx={4} fill="#0F1C12" />
    <Rect x={258} y={128} width={62} height={58} rx={4} fill="#0F1C12" />
    <Rect x={0} y={60} width={330} height={12} fill="#142018" />
    <Rect x={0} y={128} width={330} height={10} fill="#142018" />
    <Rect x={66} y={0} width={9} height={195} fill="#142018" />
    <Rect x={172} y={0} width={8} height={195} fill="#142018" />
    <Path d="M58 178 Q120 148 165 100 Q205 58 272 36" stroke="rgba(190,255,0,0.2)" strokeWidth={7} fill="none" strokeLinecap="round" />
    <Path d="M58 178 Q120 148 165 100 Q205 58 272 36" stroke="#BEFF00" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="6 4" />
    <Circle cx={272} cy={36} r={9} fill="rgba(190,255,0,0.18)" />
    <Circle cx={272} cy={36} r={5} fill="#BEFF00" />
    <Circle cx={58} cy={178} r={10} fill="rgba(190,255,0,0.18)" />
    <Circle cx={58} cy={178} r={6} fill="#BEFF00" />
    <Circle cx={122} cy={140} r={12} fill="rgba(0,212,160,0.1)" />
    <Circle cx={122} cy={140} r={9} fill="#06090A" />
    <Circle cx={122} cy={140} r={5} fill="#00D4A0" />
    <Rect x={90} y={93} width={65} height={22} rx={8} fill="#101C12" />
    <SvgText x={122} y={108} textAnchor="middle" fill="#BEFF00" fontSize={11} fontWeight="700">{eta} min away</SvgText>
    <SvgText x={10} y={186} fill="rgba(255,255,255,0.3)" fontSize={9}>{routeStr}</SvgText>
  </Svg>
);

export default function TrackScreen() {
  const router = useRouter();
  
  // 2. Fetch the live data
  const { data, isLoading } = useActiveRide();

  // 3. Handle loading state
  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  const routeString = `${data.route.from} → ${data.route.to} · ${data.route.distance_km} km`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Map ── */}
        <View style={{ margin: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>
          <TrackMap eta={data.eta_minutes} routeStr={routeString} />
        </View>

        {/* ── Status Pill ── */}
        <View style={{ marginHorizontal: 14, marginBottom: 10, backgroundColor: 'rgba(190,255,0,0.1)', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.28)', borderRadius: 13, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#BEFF00' }} />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#BEFF00', fontFamily: 'Outfit_700Bold' }}>{data.status_text}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(190,255,0,0.6)', fontFamily: 'Outfit_400Regular' }}>ETA {data.eta_minutes} min</Text>
        </View>

        {/* ── Driver Card ── */}
        <View style={{ marginHorizontal: 14, backgroundColor: '#101C12', borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: '#172018', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold' }}>{data.driver.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 }}>{data.driver.name}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{data.driver.rating} ★ · {data.driver.trips} trips · {data.vehicle}</Text>
            </View>
            <View style={{ backgroundColor: '#172018', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.2)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 1 }}>{data.driver.plate}</Text>
            </View>
          </View>

          {/* Driver Stats */}
          <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
            {[
              { value: data.driver.rating.toString(), label: 'Rating' }, 
              { value: `${(data.driver.trips / 1000).toFixed(1)}k`, label: 'Rides' }, 
              { value: `${data.driver.on_time_pct}%`, label: 'On time' }
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold' }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={{ flexDirection: 'row', gap: 7, marginHorizontal: 14, marginTop: 9 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#BEFF00', borderRadius: 15, padding: 13, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#060A07', fontFamily: 'Outfit_700Bold' }}>Call Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ flex: 1, backgroundColor: '#101C12', borderRadius: 15, padding: 13, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' }}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>

        {/* ── Ride Summary ── */}
        <View style={{ marginHorizontal: 14, marginTop: 0, marginBottom: 24, backgroundColor: '#101C12', borderRadius: 17, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', padding: 14 }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_400Regular', marginBottom: 8, letterSpacing: 0.5 }}>RIDE SUMMARY</Text>
          {[
            { label: 'Route', value: `${data.route.from} → ${data.route.to}`, highlight: false },
            { label: 'Vehicle', value: data.vehicle, highlight: false },
            { label: 'Distance', value: `${data.route.distance_km} km`, highlight: false },
            { label: 'Fare', value: `₹${data.fare}`, highlight: true },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < 3 ? 5 : 0 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular' }}>{row.label}</Text>
              <Text style={{ fontSize: row.highlight ? 14 : 12, fontWeight: row.highlight ? '800' : '700', color: row.highlight ? '#BEFF00' : '#EEF0E8', fontFamily: row.highlight ? 'Outfit_800ExtraBold' : 'Outfit_700Bold' }}>{row.value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}