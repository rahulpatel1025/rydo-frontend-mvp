// src/app/(tabs)/book.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Pressable,
  ActivityIndicator, StyleSheet, Alert,
  Keyboard, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Svg, Path, Circle } from 'react-native-svg';
import polyline from '@mapbox/polyline';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// API Hooks & Sockets
import { apiClient } from '../../lib/apiClient';
import { getSocket } from '../../lib/socketClient';
import { useFareEstimate, VehicleType } from '../../features/booking/api/useFareEstimate';
import { useRouteEstimate } from '../../features/booking/api/useRouteEstimate';
import { useServiceZone } from '../../features/booking/api/useServiceZone';
import { useBookRide } from '../../features/booking/api/useBookRide';
import { useNearbyDrivers } from '../../features/booking/api/useNearbyDrivers';
import { SearchIcon } from '../../components/ui/Icons';
import { themeConfig } from '../../theme';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = ({ color }: { color: string }) => (
  <Svg width={16} height={12} viewBox="0 0 16 12" fill="none">
    <Path d="M14 6H2M2 6L7 1M2 6L7 11" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SwapIcon = ({ color }: { color: string }) => (
  <Svg width={13} height={14} viewBox="0 0 13 14" fill="none">
    <Path d="M3 1.5V12.5M3 12.5L1 10.5M3 12.5L5 10.5M10 12.5V1.5M10 1.5L8 3.5M10 1.5L12 3.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PinIcon = ({ color = '#BEFF00', centerColor }: { color?: string; centerColor: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill={color} opacity={0.9} />
    <Circle cx={12} cy={9} r={3} fill={centerColor} />
  </Svg>
);
const MapPinSearchIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={2} />
  </Svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStep = 'select_pickup' | 'select_dropoff' | 'route_preview';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

const INDIA_FALLBACK = {
  latitude: 20.5937, longitude: 78.9629,
  latitudeDelta: 15, longitudeDelta: 15,
};

const VEHICLES: { id: VehicleType; label: string; icon: string }[] = [
  { id: 'bike',        label: 'Bike',       icon: '🛵' },
  { id: 'auto',        label: 'Auto',       icon: '🛺' },
  { id: 'shared_auto', label: 'Share Auto', icon: '🚐' },
];

function extractRouteData(obj: any): any {
  if (!obj) return null;
  if (obj.geometry && obj.distance_km !== undefined) return obj;
  if (obj.data) return extractRouteData(obj.data);
  return null;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BookScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // ── Theme ──
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  const [step, setStep]                           = useState<WorkflowStep>('select_pickup');
  const [isSearchFocused, setIsSearchFocused]     = useState(false);
  const [mapMoving, setMapMoving]                 = useState(false);
  const [pickup, setPickup]                       = useState<LocationData | null>(null);
  const [dropoff, setDropoff]                     = useState<LocationData | null>(null);
  const [selectedVehicle, setSelectedVehicle]     = useState<VehicleType | null>(null);
  const [currentRegion, setCurrentRegion]         = useState<any>(null);
  const [pinAddress, setPinAddress]               = useState('Drag the map to pin your exact location.');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isWaitingForDriver, setIsWaitingForDriver] = useState(false);

  const { mutateAsync: bookRide, isPending: isBookingLive } = useBookRide();

  // ── Reset waiting state every time this screen gains focus ──────
  useFocusEffect(
    useCallback(() => {
      setIsWaitingForDriver(false);
    }, [])
  );

  // ── Socket listeners for ride matching ────────────────────────────────────
  useEffect(() => {
    if (!isWaitingForDriver) return;

    const socket = getSocket();
    if (!socket) return;

    const handleRideAccepted = () => {
      setIsWaitingForDriver(false);
      router.push('/(tabs)/track');
    };

    const handleNoDrivers = () => {
      setIsWaitingForDriver(false);
      Alert.alert(
        "No Captains Available", 
        "All nearby captains are currently busy. Please try again in a few minutes."
      );
    };

    socket.on('ride:accepted', handleRideAccepted);
    socket.on('ride:no_drivers', handleNoDrivers);

    return () => {
      socket.off('ride:accepted', handleRideAccepted);
      socket.off('ride:no_drivers', handleNoDrivers);
    };
  }, [isWaitingForDriver]);

  // ── Location permission on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCurrentRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.006,
            longitudeDelta: 0.006,
          });
        } else {
          setCurrentRegion(INDIA_FALLBACK);
        }
      } catch {
        setCurrentRegion(INDIA_FALLBACK);
      }
    })();
  }, []);

  // ── Reverse geocode pin address ───────────────────────────────────────────
  useEffect(() => {
    if (step === 'route_preview' || isSearchFocused || mapMoving || !currentRegion) return;

    const fetchAddress = async () => {
      try {
        setPinAddress('Locating...');
        const res = await apiClient.get('/locations/reverse-geocode', {
          params: { lat: currentRegion.latitude, lng: currentRegion.longitude },
        });
        const payload     = res.data?.data || res.data;
        const fullAddress = payload?.address || payload?.place_name || payload?.name || payload?.text || 'Selected Location';
        setPinAddress(fullAddress.split(', ').slice(0, 3).join(', '));
      } catch {
        setPinAddress('Selected Location');
      }
    };

    const id = setTimeout(fetchAddress, 600);
    return () => clearTimeout(id);
  }, [currentRegion?.latitude, currentRegion?.longitude, mapMoving, step, isSearchFocused]);

  // ── Nearby / service-zone data ────────────────────────────────────────────
  const { data: serviceZoneData } = useServiceZone(
    pickup ? { lat: pickup.latitude, lng: pickup.longitude } : undefined
  );
  const isOutOfZone = pickup && serviceZoneData && !serviceZoneData.is_serviceable;

  const scanCoords = pickup
    ? { lat: pickup.latitude,        lng: pickup.longitude        }
    : currentRegion
    ? { lat: currentRegion.latitude, lng: currentRegion.longitude }
    : undefined;

  const { data: nearbyData } = useNearbyDrivers(scanCoords, 3);
  const liveDrivers = nearbyData?.nearby_drivers || [];

  // ── Route estimate ────────────────────────────────────────────────────────
  const routeCoords = pickup && dropoff ? {
    pickup_lat: pickup.latitude,
    pickup_lng: pickup.longitude,
    drop_lat:   dropoff.latitude,
    drop_lng:   dropoff.longitude,
  } : undefined;

  const { data: rawRouteResponse, isLoading: isRouteLoading, isError: isRouteError } = useRouteEstimate(routeCoords);
  const actualRouteData = extractRouteData(rawRouteResponse);

  let routeCoordinates: { latitude: number; longitude: number }[] = [];
  if (pickup && dropoff && actualRouteData?.geometry) {
    try {
      const geom: any = actualRouteData.geometry;
      if (typeof geom === 'string' && geom.length > 0) {
        routeCoordinates = polyline.decode(geom, 6).map(p => ({ latitude: p[0], longitude: p[1] }));
      } else if (geom.coordinates && Array.isArray(geom.coordinates)) {
        routeCoordinates = geom.coordinates.map((p: number[]) => ({ latitude: p[1], longitude: p[0] }));
      } else if (Array.isArray(geom)) {
        routeCoordinates = geom.map((p: number[]) => ({ latitude: p[0], longitude: p[1] }));
      }
      routeCoordinates = routeCoordinates
        .map(c => Math.abs(c.latitude) > 50 ? { latitude: c.longitude, longitude: c.latitude } : c)
        .filter(c => c && !isNaN(c.latitude) && c.latitude > 5 && c.latitude < 40 && !isNaN(c.longitude) && c.longitude > 60 && c.longitude < 100);
    } catch (e) {
      console.error('Polyline decode failed:', e);
    }
  }
  if (routeCoordinates.length === 0 && pickup && dropoff) {
    routeCoordinates = [pickup, dropoff];
  }

  // ── Fare estimate ─────────────────────────────────────────────────────────
  const { data: fareData, isLoading: isFareLoading, isError: isFareError } = useFareEstimate(
    pickup  ? { lat: pickup.latitude,  lng: pickup.longitude,  address: pickup.address  } : undefined,
    dropoff ? { lat: dropoff.latitude, lng: dropoff.longitude, address: dropoff.address } : undefined
  );

  useEffect(() => {
    if (!selectedVehicle && fareData?.fares && Object.keys(fareData.fares).length > 0) {
      setSelectedVehicle(Object.keys(fareData.fares)[0] as VehicleType);
    }
  }, [fareData]);

  // ── Map fit on route preview ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'route_preview' || !pickup || !dropoff) return;
    setTimeout(() => {
      const coordsToFit = routeCoordinates.length > 2 ? routeCoordinates : [pickup, dropoff];
      const valid = coordsToFit.filter(c => c && !isNaN(c.latitude) && !isNaN(c.longitude));
      if (valid.length > 1) {
        mapRef.current?.fitToCoordinates(valid, {
          edgePadding: { top: 120, right: 60, bottom: isDetailsExpanded ? 460 : 260, left: 60 },
          animated: true,
        });
      }
    }, 500);
  }, [step, pickup, dropoff, rawRouteResponse, isDetailsExpanded]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConfirmLocation = () => {
    if (!currentRegion) return;
    const coords = { latitude: currentRegion.latitude, longitude: currentRegion.longitude, address: pinAddress };
    if (step === 'select_pickup') {
      setPickup(coords);
      setStep('select_dropoff');
      setIsSearchFocused(true);
    } else if (step === 'select_dropoff') {
      setDropoff(coords);
      setStep('route_preview');
    }
  };

  const handleBack = () => {
    if (isWaitingForDriver)             setIsWaitingForDriver(false);
    else if (step === 'route_preview')  setStep('select_dropoff');
    else if (step === 'select_dropoff') setStep('select_pickup');
    else router.back();
  };

  const handleConfirmRide = async () => {
    if (!pickup || !dropoff) return;

    const vehicleChoice      = selectedVehicle || 'bike';
    const backendVehicleType = vehicleChoice === 'shared_auto' ? 'auto' : (vehicleChoice as 'bike' | 'auto');

    setIsWaitingForDriver(true);

    try {
      await bookRide({
        pickup_lat:     pickup.latitude,
        pickup_lng:     pickup.longitude,
        drop_lat:       dropoff.latitude,
        drop_lng:       dropoff.longitude,
        pickup_address: pickup.address,
        drop_address:   dropoff.address,
        is_rideshare:   vehicleChoice === 'shared_auto',
        vehicle_type:   backendVehicleType,
        payment_method: 'upi',
      });
      // Do not navigate immediately - let the socket handle it when a driver accepts
    } catch (error: any) {
      setIsWaitingForDriver(false);
      Alert.alert('Booking Error', 'Could not process the ride request at this time.');
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const availableFares = fareData?.fares || {};
  const activeFare = selectedVehicle && availableFares[selectedVehicle]
    ? availableFares[selectedVehicle]
    : Object.values(availableFares)[0];

  const rawDistance     = actualRouteData?.distance_km   ?? fareData?.distance_km      ?? 0;
  const rawDuration     = actualRouteData?.duration_mins ?? fareData?.duration_minutes  ?? 0;
  const displayDistance = Number(rawDistance).toFixed(1);
  const displayDuration = Math.abs(Math.round(Number(rawDuration)));

  const fareRows = activeFare ? [
    { label: 'Base fare (incl. 2 km)', value: `₹${activeFare.base}` },
    {
      label: selectedVehicle === 'shared_auto' && activeFare.sharedPerKmRate
        ? `Per seat / km (₹${activeFare.sharedPerKmRate}/km)`
        : `Distance (${Number(activeFare.chargeableKm).toFixed(1)} km × ₹${activeFare.perKmRate})`,
      value: `₹${activeFare.distFare}`,
    },
    { label: 'Platform fee (12%)', value: `₹${activeFare.platformFee}` },
    ...(activeFare.nightSurcharge > 0 ? [{ label: 'Night surcharge (10%)', value: `₹${activeFare.nightSurcharge}` }] : []),
    ...(activeFare.waitingFare    > 0 ? [{ label: 'Waiting charge',        value: `₹${activeFare.waitingFare}`    }] : []),
  ] : [];

  const pinColor     = step === 'select_pickup' ? theme.accent : '#FF453A';
  const hasRealRoute = routeCoordinates.length > 2;

  // ── Loading gate ─────────────────────────────────────────────────────────
  if (!currentRegion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ color: theme.textSub, marginTop: 16, fontFamily: 'Outfit_500Medium' }}>Finding your location...</Text>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={currentRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onTouchStart={() => { Keyboard.dismiss(); setIsSearchFocused(false); }}
        onRegionChange={() => setMapMoving(true)}
        onRegionChangeComplete={(r) => { setMapMoving(false); setCurrentRegion(r); }}
      >
        {liveDrivers.map((driver, index) => {
          const lat = (driver as any).location?.lat ?? (driver as any).latitude;
          const lng = (driver as any).location?.lng ?? (driver as any).longitude;
          if (!lat || !lng) return null;
          const isBike = driver.ride_type === 'BIKE' || driver.vehicle_info?.type === 'bike';
          return (
            <Marker
              key={driver.driver_id || driver.account_id || `driver-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={5}
            >
              <View style={[styles.vehicleMarker, { backgroundColor: theme.card, borderColor: theme.accent, shadowColor: theme.accent }]}>
                <Text style={{ fontSize: 16 }}>{isBike ? '🛵' : '🛺'}</Text>
              </View>
            </Marker>
          );
        })}

        {pickup && step !== 'select_pickup' && (
          <Marker coordinate={pickup} pinColor={theme.accent} title="Pickup" zIndex={10} />
        )}

        {step === 'route_preview' && pickup && dropoff && (
          <>
            <Marker coordinate={dropoff} pinColor="#FF453A" title="Drop-off" zIndex={10} />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={hasRealRoute ? '#4285F4' : '#666666'}
              strokeWidth={hasRealRoute ? 5 : 3}
              lineDashPattern={hasRealRoute ? undefined : [10, 10]}
              lineCap="round"
              lineJoin="round"
              zIndex={8}
            />
          </>
        )}
      </MapView>

      {step !== 'route_preview' && !isSearchFocused && (
        <View style={styles.centerPin} pointerEvents="none">
          <View style={{ transform: [{ translateY: mapMoving ? -10 : 0 }] }}>
            <PinIcon color={pinColor} centerColor={theme.background} />
          </View>
          <View style={[styles.pinShadow, mapMoving && { opacity: 0.3, transform: [{ scaleX: 0.7 }] }]} />
        </View>
      )}

      {/* ── Header / Search ── */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
          <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <BackIcon color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>
            {step === 'route_preview' ? 'Plan your ride' : 'Select location'}
          </Text>
        </View>

        {/* Static View: Pressable rows that mimic inputs */}
        {step !== 'route_preview' && !isSearchFocused && (
          <View style={[styles.searchCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable onPress={() => { setStep('select_pickup'); setIsSearchFocused(true); }} style={[styles.inputRow, { backgroundColor: theme.background, borderColor: step === 'select_pickup' ? theme.accent : theme.border }]}>
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.staticInputText, { color: pickup ? theme.text : theme.textSub }]} numberOfLines={1}>
                {pickup?.address || 'Enter pickup location...'}
              </Text>
            </Pressable>
            <Pressable onPress={() => { setStep('select_dropoff'); setIsSearchFocused(true); }} style={[styles.inputRow, { marginTop: 8, backgroundColor: theme.background, borderColor: step === 'select_dropoff' ? theme.accent : theme.border }]}>
              <View style={[styles.dot, { backgroundColor: '#FF453A' }]} />
              <Text style={[styles.staticInputText, { color: dropoff ? theme.text : theme.textSub }]} numberOfLines={1}>
                {dropoff?.address || 'Where to?'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Active View: Google Places Autocomplete */}
        {isSearchFocused && (
          <View style={[styles.searchCard, { backgroundColor: theme.card, borderColor: theme.border, zIndex: 999 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dot, { backgroundColor: step === 'select_pickup' ? theme.accent : '#FF453A', marginLeft: 12 }]} />
              
              <GooglePlacesAutocomplete
                key={step} 
                placeholder={step === 'select_pickup' ? 'Enter pickup location...' : 'Where to?'}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  if (details?.geometry?.location) {
                    let safeLat = Number(details.geometry.location.lat);
                    let safeLng = Number(details.geometry.location.lng);
                    if (Math.abs(safeLat) > 50) { const t = safeLat; safeLat = safeLng; safeLng = t; }

                    const r = { latitude: safeLat, longitude: safeLng, latitudeDelta: 0.004, longitudeDelta: 0.004 };
                    setCurrentRegion(r);
                    mapRef.current?.animateToRegion(r, 800);

                    const coords = { latitude: safeLat, longitude: safeLng, address: data.description };
                    if (step === 'select_pickup') {
                      setPickup(coords);
                      setStep('select_dropoff');
                    } else {
                      setDropoff(coords);
                      setIsSearchFocused(false);
                      Keyboard.dismiss();
                      setStep('route_preview');
                    }
                  }
                }}
                query={{
                  key: GOOGLE_MAPS_API_KEY,
                  language: 'en',
                  components: 'country:in',
                }}
                styles={{
                  container: { flex: 1 },
                  textInputContainer: { backgroundColor: 'transparent', borderTopWidth: 0, borderBottomWidth: 0, height: 44, justifyContent: 'center' },
                  textInput: [styles.input, { color: theme.text, backgroundColor: 'transparent', margin: 0, height: '100%', paddingHorizontal: 12 }],
                  listView: { backgroundColor: theme.background, borderRadius: 12, marginTop: 10, borderWidth: 0.5, borderColor: theme.border },
                  row: { backgroundColor: theme.background, padding: 13, minHeight: 44, flexDirection: 'row', alignItems: 'center' },
                  separator: { height: 0.5, backgroundColor: theme.border },
                }}
                renderRow={(data) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SearchIcon color={theme.textSub} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.resultName, { color: theme.text }]} numberOfLines={1}>{data.structured_formatting?.main_text || data.description}</Text>
                      {data.structured_formatting?.secondary_text && (
                        <Text style={[styles.resultSub, { color: theme.textSub }]} numberOfLines={1}>{data.structured_formatting.secondary_text}</Text>
                      )}
                    </View>
                  </View>
                )}
                textInputProps={{
                  placeholderTextColor: theme.textSub,
                  autoFocus: true,
                }}
                enablePoweredByContainer={false}
                debounce={300}
              />
            </View>

            <TouchableOpacity
              style={[styles.setOnMapBtn, { borderTopColor: theme.border }]}
              onPress={() => { setIsSearchFocused(false); Keyboard.dismiss(); }}
            >
              <View style={[styles.setOnMapIconBox, { backgroundColor: theme.accentSoft }]}>
                <MapPinSearchIcon color={theme.accent} />
              </View>
              <Text style={[styles.setOnMapText, { color: theme.accent }]}>Set location on map</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Route summary shown during preview */}
        {step === 'route_preview' && pickup && dropoff && (
          <View style={[styles.routePill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{pickup.address}</Text>
            <Text style={{ color: theme.textSub, marginHorizontal: 4 }}>→</Text>
            <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{dropoff.address}</Text>
            <TouchableOpacity onPress={() => { setStep('select_pickup'); setIsSearchFocused(true); }} style={{ marginLeft: 8 }}>
              <SwapIcon color={theme.accent} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* ── Bottom Drawer ── */}
      {!isSearchFocused && (
        <View style={[styles.drawer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {step !== 'route_preview' ? (
            <View>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>
                {step === 'select_pickup' ? 'Confirm pickup spot' : 'Confirm destination'}
              </Text>
              <Text style={[styles.drawerSub, { color: theme.textSub }]} numberOfLines={2}>
                {mapMoving ? 'Locating...' : pinAddress}
              </Text>
              <TouchableOpacity
                onPress={handleConfirmLocation}
                disabled={mapMoving}
                style={[styles.actionBtn, { backgroundColor: theme.accent }, mapMoving && { opacity: 0.5 }]}
              >
                <Text style={[styles.actionBtnText, { color: theme.background }]}>{mapMoving ? 'Locating…' : 'Confirm Location'}</Text>
              </TouchableOpacity>
            </View>

          ) : (isFareLoading || isRouteLoading) ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={{ color: theme.textSub, marginTop: 16, fontFamily: 'Outfit_500Medium' }}>Calculating fares...</Text>
            </View>

          ) : isRouteError ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ Route Calculation Failed</Text>
              <TouchableOpacity onPress={handleBack} style={[styles.actionBtn, { backgroundColor: theme.border, paddingHorizontal: 24, height: 44, marginTop: 20 }]}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Go Back</Text>
              </TouchableOpacity>
            </View>

          ) : isFareError ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ Fare Calculation Failed</Text>
              <TouchableOpacity onPress={handleBack} style={[styles.actionBtn, { backgroundColor: theme.border, paddingHorizontal: 24, height: 44, marginTop: 20 }]}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Go Back</Text>
              </TouchableOpacity>
            </View>

          ) : !fareData ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ Fares unavailable</Text>
              <TouchableOpacity onPress={handleBack} style={[styles.actionBtn, { backgroundColor: theme.border, paddingHorizontal: 24, height: 44, marginTop: 20 }]}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Go Back</Text>
              </TouchableOpacity>
            </View>

          ) : !activeFare ? (
            <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ Vehicle mismatch</Text>
              <Text style={{ color: theme.text, fontSize: 12, marginTop: 4 }}>Selected: {selectedVehicle}</Text>
              <TouchableOpacity onPress={handleBack} style={[styles.actionBtn, { backgroundColor: theme.border, paddingHorizontal: 24, height: 44, marginTop: 20 }]}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Go Back</Text>
              </TouchableOpacity>
            </View>

          ) : (
            <View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setIsDetailsExpanded(!isDetailsExpanded)} style={styles.dragHandleContainer}>
                <View style={[styles.dragHandleBar, { backgroundColor: theme.border }]} />
                <Text style={[styles.toggleText, { color: theme.accent }]}>
                  {isDetailsExpanded ? '▼ Hide Fare Breakdown' : '▲ Show Fare Breakdown'}
                </Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: isDetailsExpanded ? 400 : 180 }}>
                <View style={[styles.infoStrip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  {[
                    { value: isRouteLoading ? '...' : `${displayDistance} km`,   label: 'Distance'  },
                    { value: isRouteLoading ? '...' : `~${displayDuration} min`, label: 'Est. time' },
                    { value: 'UPI',                                               label: 'Payment'   },
                  ].map((item, i, arr) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold' }}>{item.value}</Text>
                        <Text style={{ fontSize: 10, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{item.label}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={{ width: 0.5, height: 28, backgroundColor: theme.border }} />}
                    </View>
                  ))}
                </View>

                {isOutOfZone && isDetailsExpanded && (
                  <View style={{ backgroundColor: 'rgba(255,80,80,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,80,80,0.2)', borderRadius: 12, padding: 14, marginBottom: 12, marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF8080', fontFamily: 'Outfit_700Bold' }}>⚠️ Service not available</Text>
                    <Text style={{ fontSize: 11, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 4, lineHeight: 16 }}>
                      Your pickup is outside Rydo's service area. Please select a spot inside our coverage zones.
                    </Text>
                  </View>
                )}

                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', marginTop: 14, marginBottom: 8 }}>Choose vehicle</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
                  {VEHICLES.map((v) => {
                    const active = selectedVehicle ? selectedVehicle === v.id : v.id === VEHICLES[0].id;
                    const fare   = fareData?.fares?.[v.id];
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => setSelectedVehicle(v.id)}
                        style={{ backgroundColor: active ? theme.accentSoft : theme.background, borderWidth: 0.5, borderColor: active ? theme.accent : theme.border, borderRadius: 14, padding: 11, alignItems: 'center', gap: 4, minWidth: 96 }}
                      >
                        <Text style={{ fontSize: 20 }}>{v.icon}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold' }}>{v.label}</Text>
                        <View style={{ alignItems: 'center' }}>
                          {fare?.standardTotal && fare.standardTotal > fare.total && (
                            <Text style={styles.crossedOutPrice}>₹{fare.standardTotal}</Text>
                          )}
                          <Text style={{ fontSize: 12, color: active ? theme.accent : theme.textSub, fontFamily: 'Outfit_700Bold' }}>
                            ₹{fare?.total || '--'}{v.id === 'shared_auto' ? '/seat' : ''}
                          </Text>
                          {fare?.isLaunchRate && (
                            <Text style={styles.promoBadge}>LAUNCH PROMO</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {isDetailsExpanded && activeFare && (
                  <View style={[styles.fareCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {fareRows.map((row, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: theme.textSub, fontFamily: 'Outfit_400Regular' }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, fontFamily: 'Outfit_600SemiBold' }}>{row.value}</Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: theme.textSub, fontFamily: 'Outfit_400Regular' }}>TDS (Sec 194-O, 1% Config)</Text>
                      <Text style={{ fontSize: 11, color: theme.textSub, fontFamily: 'Outfit_400Regular' }}>₹{activeFare.tds} deduction</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.summaryTotalRow, { borderTopColor: theme.border }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, fontFamily: 'Outfit_600SemiBold' }}>Total Ride Price</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    {activeFare.standardTotal && activeFare.standardTotal > activeFare.total && (
                      <Text style={[styles.crossedOutPrice, { fontSize: 14, marginBottom: 0 }]}>₹{activeFare.standardTotal}</Text>
                    )}
                    <Text style={{ fontSize: 24, fontWeight: '800', color: theme.accent, fontFamily: 'Outfit_800ExtraBold' }}>
                      ₹{activeFare.total}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmRide}
                  disabled={isBookingLive || isWaitingForDriver || !!isOutOfZone}
                  style={[styles.actionBtn, { backgroundColor: theme.accent }, (isBookingLive || isWaitingForDriver || !!isOutOfZone) && { opacity: 0.4 }]}
                >
                  {(isBookingLive || isWaitingForDriver) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ActivityIndicator color={theme.background} />
                      <Text style={[styles.actionBtnText, { color: theme.background }]}>
                        Contacting Captains...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.actionBtnText, { color: theme.background }]}>Confirm Ride Match</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1 },
  centerPin:    { position: 'absolute', top: '50%', left: '50%', marginTop: -38, marginLeft: -19, alignItems: 'center', zIndex: 99 },
  pinShadow:    { width: 8, height: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 4, marginTop: 1 },
  header:       { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 14, paddingTop: 52 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },
  searchCard:   { borderRadius: 18, padding: 12, borderWidth: 0.5 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 11, paddingHorizontal: 12, height: 44, borderWidth: 0.5 },
  dot:          { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  input:        { flex: 1, fontSize: 14, fontFamily: 'Outfit_500Medium' },
  staticInputText: { flex: 1, fontSize: 14, fontFamily: 'Outfit_500Medium', paddingVertical: 12 },
  routePill:    { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5 },
  routeText:    { flex: 1, fontSize: 12, fontFamily: 'Outfit_500Medium' },
  setOnMapBtn:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderTopWidth: 0.5, marginTop: 10 },
  setOnMapIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  setOnMapText:    { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  resultName:   { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  resultSub:    { fontSize: 10, marginTop: 2 },
  drawer:       { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 32, borderTopWidth: 0.5 },
  drawerTitle:  { fontSize: 17, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3, marginTop: 10 },
  drawerSub:    { fontSize: 12, marginTop: 5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  dragHandleContainer: { width: '100%', alignItems: 'center', paddingVertical: 8, marginBottom: 6 },
  dragHandleBar: { width: 44, height: 4, borderRadius: 2 },
  toggleText:   { fontSize: 10, fontFamily: 'Outfit_600SemiBold', marginTop: 5, letterSpacing: 0.3 },
  actionBtn:    { borderRadius: 16, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  actionBtnText:{ fontSize: 15, fontFamily: 'Outfit_800ExtraBold' },
  infoStrip:    { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5 },
  fareCard:     { marginTop: 12, borderRadius: 17, borderWidth: 0.5, padding: 13 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 10, borderTopWidth: 0.5 },
  crossedOutPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: 2,
    fontFamily: 'Outfit_500Medium',
  },
  promoBadge: {
    fontSize: 9,
    color: '#F59E0B',
    fontFamily: 'Outfit_800ExtraBold',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  vehicleMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
});