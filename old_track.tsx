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
import { themeConfig } from '../../theme';

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
  const [routeDriverCoords, setRouteDriverCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ id: string, fare: number } | null>(null);
  
  const latestCoordsRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const isNavigatingAwayRef = useRef(false);
  const subscribedRideIdRef = useRef<string | null>(null);

  // ✨ FIX: Safely store handler references so we ONLY remove track.tsx listeners
  const handlersRef = useRef<{ [event: string]: (payload: any) => void }>({});

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
    const actualRideId = data?.ride_id || data?.id;

    if (!actualRideId) return;
    if (subscribedRideIdRef.current === actualRideId.toString()) return; 

    let localSocket = getSocket();
    let isMounted = true;

    const setupSocket = async () => {
      try {
        if (!localSocket?.connected) {
          localSocket = await connectSocket();
        }
        if (!isMounted) return;

        subscribedRideIdRef.current = actualRideId.toString();
        console.log(`[USER DEBUG] 🎧 JOINING SOCKET ROOM: ${actualRideId}`);
        
        localSocket.emit('ride:join', { ride_id: actualRideId }, (ack: any) => {
          console.log(`[USER DEBUG] Room Join Ack:`, ack);
        });

        const onLocationUpdate = (payload: any) => {
          if (!isMounted) return;
          if (payload?.location) {
            setLiveDriverCoords({ latitude: payload.location.lat, longitude: payload.location.lng });
            if (payload.eta_minutes !== undefined) setLiveEta(payload.eta_minutes);
          }
        };

        const createStatusHandler = (event: string) => (payload: any) => {
          if (!isMounted) return;
          console.log(`[USER DEBUG] 📡 ${event} — invalidating query. Payload:`, payload);
          queryClient.invalidateQueries({ queryKey: ['activeRide'] });
        };

        handlersRef.current['driver:location-update'] = onLocationUpdate;
        handlersRef.current['ride:status-update'] = createStatusHandler('ride:status-update');
        handlersRef.current['ride:accepted'] = createStatusHandler('ride:accepted');
        handlersRef.current['ride:arrived'] = createStatusHandler('ride:arrived');
        handlersRef.current['ride:started'] = createStatusHandler('ride:started');
        handlersRef.current['ride:cancelled'] = createStatusHandler('ride:cancelled');
        handlersRef.current['ride:completed'] = createStatusHandler('ride:completed');

        Object.entries(handlersRef.current).forEach(([event, handler]) => {
          localSocket?.on(event, handler);
        });

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
        
        Object.entries(handlersRef.current).forEach(([event, handler]) => {
          s.off(event, handler);
        });
        
        handlersRef.current = {};
        subscribedRideIdRef.current = null;
      }
    };
  }, [data?.id, data?.ride_id, queryClient]);

  // ── Derived State ──
  const currentStatus = data?.status?.toUpperCase();
  const currentEta = liveEta !== null ? liveEta : data?.eta_minutes;

  const isSearching = currentStatus === 'SEARCHING';
  const isBoarded = currentStatus === 'BOARDED' || currentStatus === 'TRIP_ACTIVE';
  const isArrived = currentStatus === 'ARRIVED';

  // ✨ NEW: If the driver cancels and the backend re-queues the ride (SEARCHING),
  // we must instantly clear the old driver's location and ETA from the local state.
  useEffect(() => {
    if (isSearching) {
      setLiveDriverCoords(null);
      setLiveEta(null);
      setRouteDriverCoords(null);
      latestCoordsRef.current = null;
    }
  }, [isSearching]);

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
    if (currentStatus === 'CANCELLED') {
      const driverHadAccepted = !!data.driver?.name;

      if (driverHadAccepted) {
        Alert.alert(
          "Captain Cancelled",
          "Your captain had to cancel the trip. Please book a new ride.",
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

    if (currentStatus === 'COMPLETED') {
      setPendingPayment({
        id: data.id.toString(),
        fare: Number((data as any).fareTotal ?? (data as any).fare_total ?? 0),
      });
    }
  }, [currentStatus, data, data?.driver?.name, queryClient, safeNavigateHome]);

  useEffect(() => {
    if (isFetched && !data && !pendingPayment) {
      queryClient.removeQueries({ queryKey: ['activeRide'] });
      safeNavigateHome();
    }
  }, [isFetched, data, pendingPayment, queryClient, safeNavigateHome]);

  // ── Map Animation ──
  useEffect(() => {
    if (mapRef.current && !isSearching && liveDriverCoords) {
      mapRef.current.animateCamera({ center: liveDriverCoords, zoom: 16 }, { duration: 1000 });
    }
  }, [isSearching, liveDriverCoords]);

  if (pendingPayment) {
    return (
      <RidePaymentScreen
        rideId={pendingPayment.id}
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
            customMapStyle={colorScheme === 'dark' ? customDarkMapStyle : []}
            style={styles.mapView}
            initialRegion={defaultRegion}
            showsUserLocation={true}
            showsCompass={false}
            pitchEnabled={false}
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
                 isArrived ? 'Captain has arrived' :
                 isBoarded ? 'Heading to destination' : 'Captain is on the way'}
              </Text>
              {!isSearching && (
                <Text style={[styles.etaText, { color: theme.textSub }]}>
                  {isBoarded ? `Drop-off in ~${currentEta} min` : 
                   isArrived ? 'Please board the vehicle' : 
                   `Arriving in ${dynamicEta} min`}
                </Text>
              )}
            </View>
          </View>

          {!isSearching && !isBoarded && data.otp && (
            <View style={[styles.otpBox, { backgroundColor: theme.accent }]}>
              <Text style={[styles.otpLabel, { color: theme.background }]}>PIN</Text>
              <Text style={[styles.otpValue, { color: theme.background }]}>{data.otp}</Text>
            </View>
          )}
        </View>

        {isSearching ? (
          <View style={[styles.searchingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 12 }} />
            <Text style={[styles.searchingTitle, { color: theme.accent }]}>Contacting Captains</Text>
            <Text style={[styles.searchingSubText, { color: theme.textSub }]}>Please wait while we match you with the nearest available vehicle.</Text>
          </View>
        ) : (
          <View style={[styles.driverCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.background }]}>
                <Text style={[styles.driverInitials, { color: theme.accent }]}>{data?.driver?.initials || 'DR'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, { color: theme.text }]}>{data?.driver?.name || 'Your Captain'}</Text>
                <Text style={[styles.driverSubText, { color: theme.textSub }]}>
                  {data?.driver?.rating || 5.0} ★ · {data?.driver?.trips || 0} trips · {data?.vehicle || 'Auto'}
                </Text>
              </View>
              <View style={[styles.plateBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.plateText, { color: theme.accent }]}>{data?.driver?.plate || 'MH-12'}</Text>
              </View>
            </View>

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

  sharedBanner: { marginHorizontal: 14, marginBottom: 10, backgroundColor: 'rgba(255,165,0,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,165,0,0.3)', borderRadius: 12, padding: 12 },
  sharedBannerText: { color: 'rgba(255,200,100,0.9)', fontSize: 12, fontFamily: 'Outfit_500Medium', lineHeight: 18 },
  statusPill: { marginHorizontal: 14, marginBottom: 10, borderWidth: 0.5, borderRadius: 16, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  statusText: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.2 },
  etaText: { fontSize: 11, fontFamily: 'Outfit_500Medium', marginTop: 2 },
  otpBox: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  otpLabel: { fontSize: 9, fontFamily: 'Outfit_700Bold', letterSpacing: 1 },
  otpValue: { fontSize: 16, fontWeight: '900', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 2, marginTop: -2 },

  searchingCard: { marginHorizontal: 14, borderRadius: 19, borderWidth: 0.5, padding: 24, alignItems: 'center', justifyContent: 'center' },
  searchingTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', marginBottom: 4 },
  searchingSubText: { fontSize: 13, fontFamily: 'Outfit_400Regular', textAlign: 'center', paddingHorizontal: 20 },

  driverCard: { marginHorizontal: 14, borderRadius: 19, borderWidth: 0.5, padding: 15 },
  driverAvatar: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: 19, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  driverName: { fontSize: 15, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
  driverSubText: { fontSize: 11, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  plateBox: { borderWidth: 0.5, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  plateText: { fontSize: 12, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 0.5 },
  statValue: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  statLabel: { fontSize: 10, fontFamily: 'Outfit_400Regular', marginTop: 2 },
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
