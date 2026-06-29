// src/app/(tabs)/track.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import polyline from '@mapbox/polyline';

import { useActiveRide } from '../../features/booking/api/useActiveRide';
import { apiClient } from '../../lib/apiClient';
import { getSocket, connectSocket } from '../../lib/socketClient';
import { useRouteEstimate } from '../../features/booking/api/useRouteEstimate';
import RidePaymentScreen from '../../features/payments/RidePaymentScreen';
import { themeConfig } from '../../theme'; // Import your theme dictionary

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
  const queryClient = useQueryClient();

  const { data, isLoading, isFetched } = useActiveRide();

  // ── Theme Hook ──
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  // ── LOCAL LIVE STATE ──
  const [liveDriverCoords, setLiveDriverCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [liveEta, setLiveEta] = useState<number | null>(null);

  // 🚨 THROTTLE STATE: Protects your API billing limits
  const [routeDriverCoords, setRouteDriverCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ id: string, passengerId: string, fare: number } | null>(null);
  const [isUserPanning, setIsUserPanning] = useState(false);
  const latestCoordsRef = useRef<{ latitude: number, longitude: number } | null>(null);

  const isNavigatingAwayRef = useRef(false);
  const subscribedRideIdRef = useRef<string | null>(null);

  // ── THROTTLE LOGIC (30 Seconds) ──
  useEffect(() => {
    latestCoordsRef.current = liveDriverCoords;
    if (liveDriverCoords && !routeDriverCoords) {
      setRouteDriverCoords(liveDriverCoords);
    }
  }, [liveDriverCoords]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (latestCoordsRef.current) {
        setRouteDriverCoords(latestCoordsRef.current);
      }
    }, 30000); 

    return () => clearInterval(interval);
  }, []);

  // ── Safe Navigation Helper ──
  const safeNavigateHome = useCallback(() => {
    if (isNavigatingAwayRef.current) return;
    isNavigatingAwayRef.current = true;

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const cancelRideMutation = useMutation({
    mutationFn: async (ridePassengerId: string) => {
      const res = await apiClient.post(`/users/rides/${ridePassengerId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRide'] });
      queryClient.removeQueries({ queryKey: ['activeRide'] });
      safeNavigateHome();
    },
    onError: (error: any) => {
      isNavigatingAwayRef.current = false; 
      Alert.alert('Cancellation Failed', error.response?.data?.message || 'Failed to cancel the ride.');
    }
  });

  const handleCancelRide = useCallback(() => {
    if (!data?.id) return;
    Alert.alert("Cancel Ride?", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      { text: "Yes, Cancel", style: "destructive", onPress: () => cancelRideMutation.mutate(data.id) }
    ]);
  }, [data?.id, cancelRideMutation]);

  // ── WebSocket Integration ──
  useEffect(() => {
    if (!data?.id) return;
    if (subscribedRideIdRef.current === data.id) return; 

    let localSocket = getSocket();
    let isMounted = true;

    const setupSocket = async () => {
      try {
        if (!localSocket?.connected) {
          localSocket = await connectSocket();
        }
        if (!isMounted) return;

        subscribedRideIdRef.current = data.id;
        console.log(`[USER DEBUG] 🎧 JOINING SOCKET ROOM: ${data.id}`);
        localSocket.emit('ride:join', { ride_id: data.id });

        localSocket.on('driver:location-update', (payload: any) => {
          if (!isMounted) return;
          if (payload?.location) {
            setLiveDriverCoords({
              latitude: payload.location.lat,
              longitude: payload.location.lng,
            });
            if (payload.eta_minutes !== undefined) setLiveEta(payload.eta_minutes);
          }
        });

        const handleStatusChange = (event: string) => (payload: any) => {
          if (!isMounted) return;
          console.log(`[USER DEBUG] 📡 ${event} — invalidating query`);
          queryClient.invalidateQueries({ queryKey: ['activeRide'] });
        };

        localSocket.on('ride:status-update', handleStatusChange('ride:status-update'));
        localSocket.on('ride:accepted', handleStatusChange('ride:accepted'));
        localSocket.on('ride:arrived', handleStatusChange('ride:arrived'));
        localSocket.on('ride:started', handleStatusChange('ride:started'));
        localSocket.on('ride:cancelled', handleStatusChange('ride:cancelled'));
        localSocket.on('ride:completed', handleStatusChange('ride:completed'));
      } catch (err) {
        console.error('[USER DEBUG] Socket setup failed:', err);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      const s = getSocket();
      if (s && subscribedRideIdRef.current) {
        console.log(`[USER DEBUG] 🚪 LEAVING SOCKET ROOM: ${subscribedRideIdRef.current}`);
        s.emit('ride:leave', { ride_id: subscribedRideIdRef.current });
        s.off('driver:location-update');
        s.off('ride:status-update');
        s.off('ride:accepted');
        s.off('ride:arrived');
        s.off('ride:started');
        s.off('ride:cancelled');
        s.off('ride:completed');
        subscribedRideIdRef.current = null;
      }
    };
  }, [data?.id, queryClient]);

  // ── Derived State ──
  const currentStatus = data?.status?.toUpperCase();
  const currentEta = liveEta !== null ? liveEta : data?.eta_minutes;

  const isSearching = currentStatus === 'SEARCHING';
  const isBoarded = currentStatus === 'BOARDED' || currentStatus === 'TRIP_ACTIVE';
  const isArrived = currentStatus === 'ARRIVED';

  const isApproaching = !isSearching && !isBoarded && !isArrived && !!routeDriverCoords && !!data?.pickup?.location;

  const approachParams = isApproaching && routeDriverCoords ? {
    pickup_lat: routeDriverCoords.latitude,
    pickup_lng: routeDriverCoords.longitude,
    drop_lat: data.pickup.location.lat,
    drop_lng: data.pickup.location.lng,
  } : undefined;

  const { data: approachData } = useRouteEstimate(approachParams);

  let approachCoords: { latitude: number; longitude: number }[] = [];
  let dynamicEta = currentEta; 

  if (isApproaching && approachData) {
    const rawDuration = approachData.duration_mins || (approachData as any)?.data?.duration_mins;
    if (rawDuration !== undefined) {
      dynamicEta = Math.abs(Math.round(Number(rawDuration)));
    }

    const geom = approachData.geometry || (approachData as any)?.data?.geometry;
    if (geom && typeof geom === 'string') {
      try {
        const rawPoints = polyline.decode(geom, 6);
        approachCoords = rawPoints.map(p => ({ latitude: p[0], longitude: p[1] }));
      } catch (e) {
        console.error("Approach polyline decode failed", e);
      }
    }
  }

  // ── Terminal State Handling ──
  useEffect(() => {
    if (!data) return;

    // Note: If the backend handles driver cancellations by keeping the ride alive
    // and setting it to SEARCHING, this CANCELLED block will not fire. 
    // This block only fires if the ride is completely permanently dead.
    if (data.status === 'cancelled') {
      const driverHadAccepted = !!data.driver?.name;

      if (driverHadAccepted) {
        Alert.alert(
          "Captain Cancelled",
          "Your captain had to cancel the trip. We'll find you a new one.",
          [{
            text: "OK",
            onPress: () => {
              queryClient.removeQueries({ queryKey: ['activeRide'] });
              safeNavigateHome();
            }
          }]
        );
      } else {
        queryClient.removeQueries({ queryKey: ['activeRide'] });
        safeNavigateHome();
      }
    }

    if (data.status === 'completed') {
      setPendingPayment({
        id: data.ride_id ? data.ride_id.toString() : data.id.toString(),
        passengerId: data.id.toString(),
        fare: Number((data as any).fareTotal ?? (data as any).fare_total ?? 0),
      });
    }
  }, [data, queryClient, safeNavigateHome]);

  useEffect(() => {
    if (isFetched && !data && !pendingPayment) {
      queryClient.removeQueries({ queryKey: ['activeRide'] });
      safeNavigateHome();
    }
  }, [isFetched, data, pendingPayment, queryClient, safeNavigateHome]);

  // ── Map Animation ──
  useEffect(() => {
    if (mapRef.current && !isSearching && liveDriverCoords && !isUserPanning) {
      mapRef.current.animateCamera({ center: liveDriverCoords, zoom: 16 }, { duration: 1000 });
    }
  }, [isSearching, liveDriverCoords, isUserPanning]);

  if (pendingPayment) {
    return (
      <RidePaymentScreen
        rideId={pendingPayment.id}
        ridePassengerId={pendingPayment.passengerId}
        fareAmount={pendingPayment.fare}
        onPaymentComplete={() => {
          setPendingPayment(null);
          queryClient.removeQueries({ queryKey: ['activeRide'] });
          safeNavigateHome();
        }}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  const routeCoords = data?.route?.coords || [];
  const hasRoute = routeCoords.length > 0;

  const defaultRegion = {
    latitude: data?.pickup?.location?.lat || 20.2731,
    longitude: data?.pickup?.location?.lng || 72.9966,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  };

  let displayFrom = data.route?.from || 'Pickup';
  if (displayFrom.includes("Drag the map")) {
    displayFrom = "Pinned Location";
  }
  const routeString = `${displayFrom} → ${data.route?.to || 'Drop-off'}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={[styles.mapContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            // Auto-switch map style based on Light/Dark mode
            customMapStyle={colorScheme === 'dark' ? customDarkMapStyle : []}
            style={styles.mapView}
            initialRegion={defaultRegion}
            showsUserLocation={true}
            showsCompass={false}
            pitchEnabled={false}
            onTouchStart={() => setIsUserPanning(true)}
            onPanDrag={() => setIsUserPanning(true)}
          >
            {/* 1. Main Trip Route */}
            {hasRoute && (
              <Polyline 
                coordinates={routeCoords} 
                strokeColor={isBoarded ? theme.accent : "#666666"} 
                strokeWidth={isBoarded ? 4 : 3} 
                lineJoin="round" 
                lineCap="round" 
                lineDashPattern={isBoarded ? undefined : [10, 10]} 
              />
            )}

            {/* 2. Driver Approach Route */}
            {approachCoords.length > 0 && (
              <Polyline 
                coordinates={approachCoords} 
                strokeColor="#4285F4" 
                strokeWidth={4} 
                lineJoin="round" 
                lineCap="round" 
              />
            )}

            {data?.pickup?.location && (
              <Marker coordinate={{ latitude: data.pickup.location.lat, longitude: data.pickup.location.lng }}>
                <View style={[styles.pickupMarker, { backgroundColor: theme.accentSoft }]}>
                  <View style={[styles.pickupMarkerCore, { backgroundColor: theme.accent }]} />
                </View>
              </Marker>
            )}

            {!isSearching && !isBoarded && liveDriverCoords && (
              <Marker coordinate={liveDriverCoords} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={[styles.driverMarker, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                  <Text style={{ fontSize: 16 }}>🛺</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {!isSearching && !isBoarded && !isArrived && typeof dynamicEta === 'number' && (
            <View style={[styles.mapOverlayPill, { backgroundColor: theme.card, borderColor: theme.accent }]}>
              <Text style={[styles.mapOverlayText, { color: theme.accent }]}>{dynamicEta} min away</Text>
            </View>
          )}

          <Text style={[styles.mapOverlayRoute, { backgroundColor: theme.card, color: theme.textSub }]} numberOfLines={1}>{routeString}</Text>

          {isUserPanning && !isSearching && !isBoarded && (
            <TouchableOpacity 
              style={[styles.recenterBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                setIsUserPanning(false);
                if (liveDriverCoords && mapRef.current) {
                  mapRef.current.animateCamera({ center: liveDriverCoords, zoom: 16 }, { duration: 500 });
                }
              }}
            >
              <Text style={[styles.recenterBtnText, { color: theme.background }]}>Re-center</Text>
            </TouchableOpacity>
          )}
        </View>

        {data.is_rideshare && !isBoarded && (
          <View style={styles.sharedBanner}>
            <Text style={styles.sharedBannerText}>
              🚐 You are in a shared ride. The captain may pick up or drop off others along the way.
            </Text>
          </View>
        )}

        <View style={[styles.statusPill, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            {isSearching ? (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 4 }} />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: isBoarded ? '#00D4A0' : theme.accent }]} />
            )}
            <View>
              <Text style={[styles.statusText, { color: isBoarded ? '#00D4A0' : theme.accent }]}>
                {isSearching ? 'Finding your captain...' :
                 isArrived ? 'Captain has arrived — show your PIN' :
                 isBoarded ? 'Heading to destination' : 'Captain is on the way'}
              </Text>
              {!isSearching && (
                <Text style={[styles.etaText, { color: theme.textSub }]}>
                  {isBoarded ? `Drop-off in ~${currentEta} min` :
                   isArrived ? 'Read the PIN below to your captain to start' :
                   `Arriving in ${dynamicEta} min`}
                </Text>
              )}
            </View>
          </View>
        </View>

        {isSearching ? (
          <View style={[styles.searchingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 12 }} />
            <Text style={[styles.searchingTitle, { color: theme.accent }]}>Contacting Captains</Text>
            <Text style={[styles.searchingSubText, { color: theme.textSub }]}>Please wait while we match you with the nearest available vehicle.</Text>
          </View>
        ) : (
          <View style={[styles.driverCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* ── Driver identity row ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.background }]}>
                <Text style={[styles.driverInitials, { color: theme.accent }]}>{data?.driver?.initials || 'DR'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, { color: theme.text }]}>{data?.driver?.name || 'Your Captain'}</Text>
                <Text style={[styles.driverSubText, { color: theme.textSub }]}>
                  {data?.driver?.rating || 5.0} ★ · {data?.driver?.trips || 0} trips
                </Text>
                <Text style={[styles.driverVehicle, { color: theme.textSub }]}>
                  {data?.vehicle || 'Auto'}
                </Text>
              </View>
              <View style={[styles.plateBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.plateLabel, { color: theme.textSub }]}>PLATE</Text>
                <Text style={[styles.plateText, { color: theme.accent }]}>{data?.driver?.plate || '—'}</Text>
              </View>
            </View>

            {/* ── Stats row ── */}
            <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
              {[
                { value: data?.driver?.rating?.toString() || '5.0', label: 'Rating' },
                { value: `${((data?.driver?.trips || 0) / 1000).toFixed(1)}k`, label: 'Rides' },
                { value: `${data?.driver?.on_time_pct || 98}%`, label: 'On time' }
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSub }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Start PIN Badge — shown only when driver has arrived ── */}
        {isArrived && data?.otp ? (
          <View style={[styles.pinBadge, { backgroundColor: theme.card, borderColor: theme.accent }]}>
            <Text style={[styles.pinBadgeHelper, { color: theme.textSub }]}>📍 Read this PIN to your captain to start the trip</Text>
            <View style={styles.pinDigitsRow}>
              {data.otp.split('').map((digit, i) => (
                <View key={i} style={[styles.pinDigitBox, { backgroundColor: theme.background, borderColor: theme.accent }]}>
                  <Text style={[styles.pinDigit, { color: theme.accent }]}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.pinBadgeNote, { color: theme.textSub }]}>Expires once your trip begins</Text>
          </View>
        ) : !isSearching && !isBoarded && data?.otp ? (
          // Accepted state — show a smaller, less urgent hint
          <View style={[styles.pinHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.pinHintText, { color: theme.textSub }]}>
              🔒 Your start PIN is ready — share it with your captain when they arrive
            </Text>
            <Text style={[styles.pinHintValue, { color: theme.accent }]}>{data.otp}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: theme.text }, isSearching && { opacity: 0.3 }]}
            disabled={isSearching}
          >
            <Text style={[styles.callBtnText, { color: theme.background }]}>Call Captain</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancelRide}
            style={[styles.cancelBtn, { backgroundColor: theme.card, borderColor: theme.border }, (isBoarded || cancelRideMutation.isPending) && { opacity: 0.4 }]}
            disabled={isBoarded || cancelRideMutation.isPending}
          >
            <Text style={[styles.cancelBtnText, { color: theme.text }]}>
              {cancelRideMutation.isPending ? 'Cancelling...' : 'Cancel Search'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.textSub }]}>RIDE DETAILS</Text>
          {[
            { label: 'Route', value: routeString, highlight: false },
            { label: 'Vehicle', value: (data?.vehicle || '') + (data?.is_rideshare ? ' (Shared)' : ''), highlight: false },
            { label: 'Distance', value: 'Tracked via GPS', highlight: false },
            { label: 'Total Fare', value: 'Calculated at drop-off', highlight: true },
          ].map((row, i) => (
            <View key={i} style={[styles.summaryRow, i < 3 && { marginBottom: 5 }]}>
              <Text style={[styles.summaryLabel, { color: theme.textSub }]}>{row.label}</Text>
              <Text style={[
                styles.summaryValue,
                { color: theme.text },
                row.highlight && styles.summaryValueHighlight,
                row.highlight && { color: theme.accent, fontSize: 13 } 
              ]} numberOfLines={1}>
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
  mapContainer: { margin: 14, height: 195, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, position: 'relative' },
  mapView: { flex: 1 },
  pickupMarker: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pickupMarkerCore: { width: 8, height: 8, borderRadius: 4 },
  driverMarker: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  mapOverlayPill: { position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  mapOverlayText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit_700Bold' },
  mapOverlayRoute: { position: 'absolute', bottom: 10, left: 14, right: 14, fontSize: 10, fontFamily: 'Outfit_500Medium', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recenterBtn: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  recenterBtnText: { fontSize: 11, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },

  sharedBanner: { marginHorizontal: 14, marginBottom: 10, backgroundColor: 'rgba(255,165,0,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,165,0,0.3)', borderRadius: 12, padding: 12 },
  sharedBannerText: { color: 'rgba(255,200,100,0.9)', fontSize: 12, fontFamily: 'Outfit_500Medium', lineHeight: 18 },
  statusPill: { marginHorizontal: 14, marginBottom: 10, borderWidth: 0.5, borderRadius: 16, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  statusText: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.2 },
  etaText: { fontSize: 11, fontFamily: 'Outfit_500Medium', marginTop: 2 },

  searchingCard: { marginHorizontal: 14, borderRadius: 19, borderWidth: 0.5, padding: 24, alignItems: 'center', justifyContent: 'center' },
  searchingTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', marginBottom: 4 },
  searchingSubText: { fontSize: 13, fontFamily: 'Outfit_400Regular', textAlign: 'center', paddingHorizontal: 20 },

  driverCard: { marginHorizontal: 14, borderRadius: 19, borderWidth: 0.5, padding: 15 },
  driverAvatar: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: 19, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  driverName: { fontSize: 15, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
  driverSubText: { fontSize: 11, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  driverVehicle: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', marginTop: 1 },
  plateBox: { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 64 },
  plateLabel: { fontSize: 8, fontFamily: 'Outfit_700Bold', letterSpacing: 1, marginBottom: 2 },
  plateText: { fontSize: 12, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 0.5 },
  statValue: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  statLabel: { fontSize: 10, fontFamily: 'Outfit_400Regular', marginTop: 2 },

  // ── Start PIN badge (driver arrived state) ──
  pinBadge: { marginHorizontal: 14, marginTop: 10, borderRadius: 20, borderWidth: 1.5, padding: 20, alignItems: 'center' },
  pinBadgeHelper: { fontSize: 12, fontFamily: 'Outfit_500Medium', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  pinDigitsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pinDigitBox: { width: 54, height: 64, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pinDigit: { fontSize: 34, fontWeight: '900', fontFamily: 'Outfit_800ExtraBold' },
  pinBadgeNote: { fontSize: 10, fontFamily: 'Outfit_400Regular' },

  // ── Start PIN hint (driver accepted / approaching state) ──
  pinHint: { marginHorizontal: 14, marginTop: 10, borderRadius: 14, borderWidth: 0.5, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinHintText: { fontSize: 11, fontFamily: 'Outfit_400Regular', flex: 1, lineHeight: 16 },
  pinHintValue: { fontSize: 20, fontWeight: '900', fontFamily: 'Outfit_800ExtraBold', marginLeft: 12, letterSpacing: 3 },
  actionRow: { flexDirection: 'row', gap: 7, marginHorizontal: 14, marginTop: 9 },
  callBtn: { flex: 1, borderRadius: 15, padding: 14, alignItems: 'center' },
  callBtnText: { fontSize: 13, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  cancelBtn: { flex: 1, borderRadius: 15, padding: 14, alignItems: 'center', borderWidth: 0.5 },
  cancelBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Outfit_700Bold' },
  summaryCard: { marginHorizontal: 14, marginTop: 10, marginBottom: 24, borderRadius: 17, borderWidth: 0.5, padding: 15 },
  summaryTitle: { fontSize: 10, fontFamily: 'Outfit_700Bold', marginBottom: 12, letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  summaryLabel: { fontSize: 12, fontFamily: 'Outfit_400Regular', width: '25%' },
  summaryValue: { fontSize: 12, fontWeight: '700', fontFamily: 'Outfit_700Bold', width: '75%', textAlign: 'right' },
  summaryValueHighlight: { fontSize: 15, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
});