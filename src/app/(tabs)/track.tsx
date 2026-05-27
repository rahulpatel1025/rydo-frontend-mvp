import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

// Import our custom hook
import { useActiveRide } from '../../features/booking/api/useActiveRide';

// Note: In a real app, this map would be a react-native-maps component. 
// We are keeping the SVG placeholder for the MVP visual prototype.
const TrackMap = ({ eta, routeStr, isBoarded }: { eta: number, routeStr: string, isBoarded: boolean }) => (
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
    
    {/* Captain Live Location Marker */}
    <Circle cx={122} cy={140} r={12} fill="rgba(0,212,160,0.1)" />
    <Circle cx={122} cy={140} r={9} fill="#06090A" />
    <Circle cx={122} cy={140} r={5} fill="#00D4A0" />
    
    {!isBoarded && (
      <>
        <Rect x={90} y={93} width={65} height={22} rx={8} fill="#101C12" />
        <SvgText x={122} y={108} textAnchor="middle" fill="#BEFF00" fontSize={11} fontWeight="700">{eta} min away</SvgText>
      </>
    )}
    <SvgText x={10} y={186} fill="rgba(255,255,255,0.3)" fontSize={9}>{routeStr}</SvgText>
  </Svg>
);

export default function TrackScreen() {
  const router = useRouter();
  
  // Fetch the live data (Now expected to return PassengerStatus and is_rideshare flags)
  const { data, isLoading } = useActiveRide();

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  const routeString = `${data.route.from} → ${data.route.to} · ${data.route.distance_km} km`;
  
  // Map PassengerStatus to boolean states
  const isBoarded = data.status === 'BOARDED';
  const isArrived = data.status === 'ARRIVED';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Map ── */}
        <View style={styles.mapContainer}>
          <TrackMap eta={data.eta_minutes} routeStr={routeString} isBoarded={isBoarded} />
        </View>

        {/* ── Shared Ride Detour Banner ── */}
        {data.is_rideshare && !isBoarded && (
          <View style={styles.sharedBanner}>
            <Text style={styles.sharedBannerText}>
              🚐 You are in a shared ride. The captain may pick up or drop off others along the way, adding up to ~{data.detour_km ?? 1.5} km to your trip.
            </Text>
          </View>
        )}

        {/* ── Status Pill & OTP ── */}
        <View style={styles.statusPill}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <View style={[styles.statusDot, isBoarded && { backgroundColor: '#00D4A0' }]} />
            <View>
              <Text style={[styles.statusText, isBoarded && { color: '#00D4A0' }]}>
                {data.status_text || (isBoarded ? 'Heading to destination' : 'Captain is on the way')}
              </Text>
              <Text style={styles.etaText}>
                {isBoarded ? `Drop-off in ~${data.eta_minutes} min` : `Arriving in ${data.eta_minutes} min`}
              </Text>
            </View>
          </View>
          
          {/* Only show OTP before the passenger boards */}
          {!isBoarded && data.otp && (
            <View style={styles.otpBox}>
              <Text style={styles.otpLabel}>PIN</Text>
              <Text style={styles.otpValue}>{data.otp}</Text>
            </View>
          )}
        </View>

        {/* ── Driver Card ── */}
        <View style={styles.driverCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>{data.driver.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{data.driver.name}</Text>
              <Text style={styles.driverSubText}>
                {data.driver.rating} ★ · {data.driver.trips} trips · {data.vehicle}
              </Text>
            </View>
            <View style={styles.plateBox}>
              <Text style={styles.plateText}>{data.driver.plate}</Text>
            </View>
          </View>

          {/* Driver Stats */}
          <View style={styles.statsRow}>
            {[
              { value: data.driver.rating.toString(), label: 'Rating' }, 
              { value: `${(data.driver.trips / 1000).toFixed(1)}k`, label: 'Rides' }, 
              { value: `${data.driver.on_time_pct}%`, label: 'On time' }
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.callBtn}>
            <Text style={styles.callBtnText}>Call Captain</Text>
          </TouchableOpacity>
          
          {/* Disable cancellation after boarding */}
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.cancelBtn, isBoarded && { opacity: 0.4 }]}
            disabled={isBoarded}
          >
            <Text style={styles.cancelBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>

        {/* ── Ride Summary ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>RIDE SUMMARY</Text>
          {[
            { label: 'Route', value: `${data.route.from} → ${data.route.to}`, highlight: false },
            { label: 'Vehicle', value: data.vehicle + (data.is_rideshare ? ' (Shared)' : ''), highlight: false },
            { label: 'Distance', value: `${data.route.distance_km} km`, highlight: false },
            { label: 'Fare', value: `₹${data.fare}`, highlight: true },
          ].map((row, i) => (
            <View key={i} style={[styles.summaryRow, i < 3 && { marginBottom: 5 }]}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={[
                styles.summaryValue, 
                row.highlight && styles.summaryValueHighlight
              ]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapContainer: { margin: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  sharedBanner: { marginHorizontal: 14, marginBottom: 10, backgroundColor: 'rgba(255,165,0,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,165,0,0.3)', borderRadius: 12, padding: 12 },
  sharedBannerText: { color: 'rgba(255,200,100,0.9)', fontSize: 12, fontFamily: 'Outfit_500Medium', lineHeight: 18 },
  statusPill: { marginHorizontal: 14, marginBottom: 10, backgroundColor: 'rgba(190,255,0,0.05)', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.2)', borderRadius: 16, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BEFF00', marginTop: 2 },
  statusText: { fontSize: 14, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.2 },
  etaText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit_500Medium', marginTop: 2 },
  otpBox: { backgroundColor: '#BEFF00', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  otpLabel: { fontSize: 9, color: 'rgba(0,0,0,0.6)', fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
  otpValue: { fontSize: 16, fontWeight: '900', color: '#060A07', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 2, marginTop: -2 },
  driverCard: { marginHorizontal: 14, backgroundColor: '#101C12', borderRadius: 19, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: 15 },
  driverAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#172018', alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: 19, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold' },
  driverName: { fontSize: 15, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
  driverSubText: { fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular', marginTop: 2 },
  plateBox: { backgroundColor: '#172018', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.2)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  plateText: { fontSize: 12, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  statValue: { fontSize: 14, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 7, marginHorizontal: 14, marginTop: 9 },
  callBtn: { flex: 1, backgroundColor: '#EEF0E8', borderRadius: 15, padding: 14, alignItems: 'center' },
  callBtnText: { fontSize: 13, fontWeight: '800', color: '#060A07', fontFamily: 'Outfit_800ExtraBold' },
  cancelBtn: { flex: 1, backgroundColor: '#101C12', borderRadius: 15, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' },
  summaryCard: { marginHorizontal: 14, marginTop: 10, marginBottom: 24, backgroundColor: '#101C12', borderRadius: 17, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', padding: 15 },
  summaryTitle: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_700Bold', marginBottom: 12, letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular' },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' },
  summaryValueHighlight: { fontSize: 15, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold' },
});