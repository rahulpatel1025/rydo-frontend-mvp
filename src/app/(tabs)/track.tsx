// src/app/(tabs)/track.tsx
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

// API & Socket
import { useActiveRide } from '../../features/booking/api/useActiveRide';
import { getSocket, connectSocket } from '../../lib/socketClient';

// ── Dark Mode Map Style ──
const customDarkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#101C12" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1B2A1E" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#06090A" }] },
];

export default function TrackScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  // 1. Fetch the initial ride data (Only runs once now!)
  const { data, isLoading } = useActiveRide();

  // 2. Real-Time State driven by WebSockets
  const [liveDriverCoords, setLiveDriverCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveEta, setLiveEta] = useState<number | null>(null);

  // Fallback pickup coords (in a production app, extract this from `data` if available)
  const pickupCoords = { latitude: 20.2760, longitude: 73.0084 };

  // ── WebSocket Integration ──
  useEffect(() => {
    let socket = getSocket();

    const setupSocket = async () => {
      // Ensure socket is connected if user refreshed the app on this screen
      if (!socket?.connected) {
        socket = await connectSocket();
      }

      if (!data?.id) return;

      // 1. Safety net: Re-join the ride room just in case
      socket.emit('rider:join-ride', { ride_id: data.id });

      // 2. Listen for the driver's car moving
      socket.on('driver:location-update', (payload: any) => {
        if (payload.location) {
          setLiveDriverCoords({
            latitude: payload.location.lat,
            longitude: payload.location.lng,
          });
          // Optional: Update ETA if backend sends distance/duration updates in payload
          if (payload.eta_minutes) setLiveEta(payload.eta_minutes);
        }
      });

      // 3. Listen for the driver accepting, arriving, or starting the trip
      socket.on('ride:status-update', (payload: any) => {
        if (payload.status) {
          setLiveStatus(payload.status.toUpperCase());
        }
      });
    };

    setupSocket();

    return () => {
      // Cleanup listeners so they don't multiply if the component re-renders
      if (socket) {
        socket.off('driver:location-update');
        socket.off('ride:status-update');
      }
    };
  }, [data?.id]);


  // ── Derived State (Prefers live Socket data over initial REST data) ──
  const currentStatus = liveStatus || data?.status;
  const currentEta = liveEta || data?.eta_minutes;
  const isBoarded = currentStatus === 'BOARDED' || currentStatus === 'TRIP_ACTIVE';
  const isArrived = currentStatus === 'ARRIVED';

  // ── Map Animation ──
  // Animate the map to keep both the pickup spot and the moving driver in view
  useEffect(() => {
    if (mapRef.current && currentStatus !== 'SEARCHING' && liveDriverCoords) {
      mapRef.current.fitToCoordinates([pickupCoords, liveDriverCoords], {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [currentStatus, liveDriverCoords]);

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

        {/* ── Real Map Implementation ── */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            customMapStyle={customDarkMapStyle}
            style={styles.mapView}
            initialRegion={{ ...pickupCoords, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
            showsUserLocation={false}
            showsCompass={false}
            pitchEnabled={false}
          >
            <Marker coordinate={pickupCoords}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupMarkerCore} />
              </View>
            </Marker>
            
            {/* Watch this marker move in real-time! */}
            {!isBoarded && liveDriverCoords && (
              <Marker coordinate={liveDriverCoords}>
                <View style={styles.driverMarker}>
                  <Text style={{ fontSize: 16 }}>🛺</Text>
                </View>
              </Marker>
            )}
          </MapView>
          
          {!isBoarded && currentEta && (
            <View style={styles.mapOverlayPill}>
              <Text style={styles.mapOverlayText}>{currentEta} min away</Text>
            </View>
          )}
          
          <Text style={styles.mapOverlayRoute}>{routeString}</Text>
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
                {isArrived ? 'Captain has arrived' : isBoarded ? 'Heading to destination' : 'Captain is on the way'}
              </Text>
              <Text style={styles.etaText}>
                {isBoarded ? `Drop-off in ~${currentEta} min` : `Arriving in ${currentEta} min`}
              </Text>
            </View>
          </View>
          
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
  mapContainer: { margin: 14, height: 195, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  mapView: { flex: 1 },
  pickupMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(190,255,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  pickupMarkerCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BEFF00' },
  driverMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#101C12', borderWidth: 2, borderColor: '#BEFF00', justifyContent: 'center', alignItems: 'center' },
  mapOverlayPill: { position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -20, backgroundColor: '#101C12', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#BEFF00' },
  mapOverlayText: { color: '#BEFF00', fontSize: 11, fontWeight: '700', fontFamily: 'Outfit_700Bold' },
  mapOverlayRoute: { position: 'absolute', bottom: 10, left: 14, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Outfit_500Medium', backgroundColor: 'rgba(6,9,10,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  
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