import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Pressable,
  ActivityIndicator, StyleSheet, TextInput, FlatList, Alert,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Svg, Path, Circle } from 'react-native-svg';
import polyline from '@mapbox/polyline';

// API Hooks
import { apiClient } from '../../lib/apiClient';
import { useFareEstimate, VehicleType } from '../../features/booking/api/useFareEstimate';
import { useRouteEstimate } from '../../features/booking/api/useRouteEstimate';
import { useLocationSearch, PlaceSearchResult } from '../../features/booking/api/useLocationSearch';
import { useServiceZone } from '../../features/booking/api/useServiceZone';
import { useBookRide } from '../../features/booking/api/useBookRide'; 
import { useNearbyDrivers } from '../../features/booking/api/useNearbyDrivers';
import { SearchIcon } from '../../components/ui/Icons';

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
const PinIcon = ({ color = '#BEFF00' }: { color?: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill={color} opacity={0.9} />
    <Circle cx={12} cy={9} r={3} fill="#06090A" />
  </Svg>
);
const MapPinSearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke="#BEFF00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={9} r={2.5} stroke="#BEFF00" strokeWidth={2} />
  </Svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStep = 'select_pickup' | 'select_dropoff' | 'route_preview';

interface LocationData {
  latitude:  number;
  longitude: number;
  address:   string;
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
  const router  = useRouter();
  const mapRef  = useRef<MapView>(null);
  const dropoffInputRef = useRef<TextInput>(null);

  const [step, setStep]                       = useState<WorkflowStep>('select_pickup');
  const [searchQuery, setSearchQuery]         = useState('');
  const [debouncedQuery, setDebouncedQuery]   = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mapMoving, setMapMoving]             = useState(false);
  const [pickup, setPickup]                   = useState<LocationData | null>(null);
  const [dropoff, setDropoff]                 = useState<LocationData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [currentRegion, setCurrentRegion]     = useState<any>(null);
  const [pinAddress, setPinAddress]           = useState('Drag the map to pin your exact location.');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

  const { mutateAsync: bookRide, isPending: isBookingLive } = useBookRide();

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
      } catch (error) {
        setCurrentRegion(INDIA_FALLBACK);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearchLoading } = useLocationSearch(
    debouncedQuery,
    currentRegion?.latitude || 0,
    currentRegion?.longitude || 0
  );

  useEffect(() => {
    if (step === 'route_preview' || isSearchFocused || mapMoving || !currentRegion) return;

    const fetchAddress = async () => {
      try {
        setPinAddress('Locating...');
        
        const res = await apiClient.get('/locations/reverse-geocode', {
          params: { lat: currentRegion.latitude, lng: currentRegion.longitude }
        });
        
        const payload = res.data?.data || res.data;
        const fullAddress = payload?.address || payload?.place_name || payload?.name || payload?.text || 'Selected Location';
        const cleanAddress = fullAddress.split(', ').slice(0, 3).join(', ');
        setPinAddress(cleanAddress);
      } catch (error) {
        setPinAddress('Selected Location');
      }
    };
    const timeoutId = setTimeout(fetchAddress, 600);
    return () => clearTimeout(timeoutId);
  }, [currentRegion?.latitude, currentRegion?.longitude, mapMoving, step, isSearchFocused]);

  const { data: serviceZoneData } = useServiceZone(
    pickup ? { lat: pickup.latitude, lng: pickup.longitude } : undefined
  );
  const isOutOfZone = pickup && serviceZoneData && !serviceZoneData.is_serviceable;

  const scanCoords = pickup ? { lat: pickup.latitude, lng: pickup.longitude } 
                   : currentRegion ? { lat: currentRegion.latitude, lng: currentRegion.longitude } 
                   : undefined;

  const { data: nearbyData } = useNearbyDrivers(scanCoords, 3);
  const liveDrivers = nearbyData?.nearby_drivers || [];

  const routeCoords = pickup && dropoff ? {
    pickup_lat: pickup.latitude,
    pickup_lng: pickup.longitude,
    drop_lat:   dropoff.latitude,
    drop_lng:   dropoff.longitude,
  } : undefined;

  const { data: rawRouteResponse, 
    isLoading: isRouteLoading, 
    isError: isRouteError } = useRouteEstimate(routeCoords);
    
    //debug 

    console.log(
  "RAW ROUTE:",
  JSON.stringify(rawRouteResponse, null, 2)
);

console.log(
  "ROUTE ERROR:",
  isRouteError
);

  const actualRouteData = extractRouteData(rawRouteResponse);

  //debug

  console.log(
  "ROUTE RESPONSE:",
  JSON.stringify(actualRouteData, null, 2)
);

  let routeCoordinates: { latitude: number; longitude: number }[] = [];
  
  if (pickup && dropoff && actualRouteData?.geometry) {
    try {
      const geom: any = actualRouteData.geometry;
      if (typeof geom === 'string' && geom.length > 0) {
        const rawPoints = polyline.decode(geom, 6);
        routeCoordinates = rawPoints.map(p => ({ latitude: p[0], longitude: p[1] }));
      } else if (geom.coordinates && Array.isArray(geom.coordinates)) {
        routeCoordinates = geom.coordinates.map((p: number[]) => ({ latitude: p[1], longitude: p[0] }));
      } else if (Array.isArray(geom)) {
        routeCoordinates = geom.map((p: number[]) => ({ latitude: p[0], longitude: p[1] }));
      }

      routeCoordinates = routeCoordinates.map(c => {
        if (Math.abs(c.latitude) > 50) return { latitude: c.longitude, longitude: c.latitude };
        return c;
      });

      routeCoordinates = routeCoordinates.filter(c => 
        c && !isNaN(c.latitude) && c.latitude > 5 && c.latitude < 40 &&
        !isNaN(c.longitude) && c.longitude > 60 && c.longitude < 100
      );
    } catch (error) {
      console.error("Polyline decode failed:", error);
    }
  }

  if (routeCoordinates.length === 0 && pickup && dropoff) {
     routeCoordinates = [pickup, dropoff]; 
  }

  //debug

  console.log(
  "ROUTE COORDS COUNT:",
  routeCoordinates.length
);

console.log(
  "ROUTE COORDS:",
  JSON.stringify(routeCoordinates, null, 2)
);

  const { data: fareData, isLoading: isFareLoading, isError: isFareError } = useFareEstimate(
    pickup  ? { lat: pickup.latitude,  lng: pickup.longitude,  address: pickup.address  } : undefined,
    dropoff ? { lat: dropoff.latitude, lng: dropoff.longitude, address: dropoff.address } : undefined
  );

useEffect(() => {
  if (
    !selectedVehicle &&
    fareData?.fares &&
    Object.keys(fareData.fares).length > 0
  ) {
    const firstVehicle =
      Object.keys(fareData.fares)[0];

    console.log(
      "AUTO SELECTING:",
      firstVehicle
    );

    setSelectedVehicle(
      firstVehicle as VehicleType
    );
  }
}, [fareData]);

  useEffect(() => {
    if (step === 'route_preview' && pickup && dropoff) {
      setTimeout(() => {
        const coordsToFit = routeCoordinates.length > 2 ? routeCoordinates : [pickup, dropoff];
        const validCoords = coordsToFit.filter(c => c && !isNaN(c.latitude) && !isNaN(c.longitude));
        
        if (validCoords.length > 1) {
          mapRef.current?.fitToCoordinates(validCoords, {
            edgePadding: { top: 120, right: 60, bottom: isDetailsExpanded ? 460 : 260, left: 60 },
            animated: true,
          });
        }
      }, 500); 
    }
  }, [step, pickup, dropoff, rawRouteResponse, isDetailsExpanded]);

  const handleSelectSearchResult = (item: PlaceSearchResult) => {
    let safeLat = Number(item.coordinates.lat);
    let safeLng = Number(item.coordinates.lng);
    if (Math.abs(safeLat) > 50) {
      const temp = safeLat; safeLat = safeLng; safeLng = temp;
    }

    const r = { latitude: safeLat, longitude: safeLng, latitudeDelta: 0.004, longitudeDelta: 0.004 };
    setCurrentRegion(r);
    mapRef.current?.animateToRegion(r, 800);
    setSearchQuery('');
    setDebouncedQuery('');
    
    const displayAddress = item.name || item.address;
    const coords = { latitude: safeLat, longitude: safeLng, address: displayAddress };

    if (step === 'select_pickup') {
      setPickup(coords);
      setStep('select_dropoff');
      setIsSearchFocused(true); 
      setTimeout(() => dropoffInputRef.current?.focus(), 100);
    } else {
      setDropoff(coords);
      setIsSearchFocused(false);
      Keyboard.dismiss();
      setStep('route_preview');
    }
  };

  const handleConfirmLocation = () => {
    if (!currentRegion) return;
    const coords = { latitude: currentRegion.latitude, longitude: currentRegion.longitude, address: pinAddress };
    if (step === 'select_pickup') {
      setPickup(coords);
      setStep('select_dropoff');
      setIsSearchFocused(true);
      setTimeout(() => dropoffInputRef.current?.focus(), 100);
    } else if (step === 'select_dropoff') {
      setDropoff(coords);
      setStep('route_preview');
    }
  };

  const handleBack = () => {
    if (step === 'route_preview')   setStep('select_dropoff');
    else if (step === 'select_dropoff') setStep('select_pickup');
    else router.back();
  };

  const handleConfirmRide = async () => {
    if (!pickup || !dropoff) return;
    
    const vehicleChoice = selectedVehicle || 'bike'; 
    const paymentChoice = 'upi'; 

    const backendVehicleType = vehicleChoice === 'shared_auto' ? 'auto' : (vehicleChoice as "bike" | "auto");

    try {
      await bookRide({
        pickup_lat: pickup.latitude,
        pickup_lng: pickup.longitude,
        drop_lat: dropoff.latitude,
        drop_lng: dropoff.longitude,
        pickup_address: pickup.address,
        drop_address: dropoff.address,
        is_rideshare: vehicleChoice === 'shared_auto', 
        vehicle_type: backendVehicleType,              
        payment_method: paymentChoice
      });
      router.push('/(tabs)/track');
    } catch (error) {
      Alert.alert('Booking Error', 'Could not process the ride request at this time.');
    }
  };

  const availableFares =
  fareData?.fares || {};

const activeFare =
  selectedVehicle &&
  availableFares[selectedVehicle]
    ? availableFares[selectedVehicle]
    : Object.values(
        availableFares
      )[0];

      //debug 

      console.log(
  "FARE KEYS:",
  Object.keys(availableFares)
);

console.log(
  "SELECTED VEHICLE:",
  selectedVehicle
);

console.log(
  "ACTIVE FARE:",
  activeFare
);


  const rawDistance = actualRouteData?.distance_km    ?? fareData?.distance_km ?? 0;
  const rawDuration = actualRouteData?.duration_mins  ?? fareData?.duration_minutes ?? 0;
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

  const pinColor = step === 'select_pickup' ? '#BEFF00' : '#FF453A';
  const hasRealRoute = routeCoordinates.length > 2;

  if (!currentRegion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontFamily: 'Outfit_500Medium' }}>Finding your location...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={currentRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onTouchStart={() => {
          Keyboard.dismiss();
          setIsSearchFocused(false);
        }}
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
              <View style={styles.vehicleMarker}>
                <Text style={{ fontSize: 16 }}>{isBike ? '🛵' : '🛺'}</Text>
              </View>
            </Marker>
          );
        })}

        {pickup && step !== 'select_pickup' && (
          <Marker coordinate={pickup} pinColor="#BEFF00" title="Pickup" zIndex={10} />
        )}

        {step === 'route_preview' && pickup && dropoff && (
          <>
            <Marker coordinate={dropoff} pinColor="#FF453A" title="Drop-off" zIndex={10} />
            <Polyline 
              coordinates={routeCoordinates} 
              strokeColor={hasRealRoute ? "#4285F4" : "#666666"} 
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
            <PinIcon color={pinColor} />
          </View>
          <View style={[styles.pinShadow, mapMoving && { opacity: 0.3, transform: [{ scaleX: 0.7 }] }]} />
        </View>
      )}

      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>
            {step === 'route_preview' ? 'Plan your ride' : 'Select location'}
          </Text>
        </View>

        {step !== 'route_preview' && (
          <View style={styles.searchCard}>
            <View style={[styles.inputRow, step === 'select_pickup' && styles.activeInput]}>
              <View style={[styles.dot, { backgroundColor: '#BEFF00' }]} />
              <TextInput
                style={styles.input}
                placeholder="Enter pickup location..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={pickup && step !== 'select_pickup' ? pickup.address : searchQuery}
                onChangeText={(t) => { setSearchQuery(t); if (pickup) setPickup(null); }}
                onFocus={() => { setStep('select_pickup'); setIsSearchFocused(true); }}
              />
            </View>
            
            <View style={[styles.inputRow, step === 'select_dropoff' && styles.activeInput, { marginTop: 8 }]}>
              <View style={[styles.dot, { backgroundColor: '#FF453A' }]} />
              <TextInput
                ref={dropoffInputRef}
                style={styles.input}
                placeholder="Where to?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={dropoff && step !== 'select_dropoff' ? dropoff.address : searchQuery}
                onChangeText={(t) => { setSearchQuery(t); if (dropoff) setDropoff(null); }}
                onFocus={() => { setStep('select_dropoff'); setIsSearchFocused(true); }}
              />
            </View>
          </View>
        )}

        {step === 'route_preview' && pickup && dropoff && (
          <View style={styles.routePill}>
            <View style={[styles.dot, { backgroundColor: '#BEFF00' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{pickup.address}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', marginHorizontal: 4 }}>→</Text>
            <Text style={styles.routeText} numberOfLines={1}>{dropoff.address}</Text>
            <TouchableOpacity onPress={() => { setStep('select_pickup'); setIsSearchFocused(true); }} style={{ marginLeft: 8 }}>
              <SwapIcon />
            </TouchableOpacity>
          </View>
        )}

        {isSearchFocused && (
          <View style={styles.autocomplete}>
            <TouchableOpacity 
              style={styles.setOnMapBtn} 
              onPress={() => {
                setIsSearchFocused(false);
                Keyboard.dismiss();
              }}
            >
              <View style={styles.setOnMapIconBox}>
                <MapPinSearchIcon />
              </View>
              <Text style={styles.setOnMapText}>Set location on map</Text>
            </TouchableOpacity>

            {isSearchLoading ? (
              <ActivityIndicator size="small" color="#BEFF00" style={{ padding: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectSearchResult(item)}>
                    <SearchIcon />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </SafeAreaView>

      {!isSearchFocused && (
        <View style={styles.drawer}>
          {step !== 'route_preview' ? (
            <View>
              <Text style={styles.drawerTitle}>
                {step === 'select_pickup' ? 'Confirm pickup spot' : 'Confirm destination'}
              </Text>
              <Text style={styles.drawerSub} numberOfLines={2}>
                {mapMoving ? 'Locating...' : pinAddress}
              </Text>
              <TouchableOpacity onPress={handleConfirmLocation} disabled={mapMoving} style={[styles.actionBtn, mapMoving && { opacity: 0.5 }]}>
                <Text style={styles.actionBtnText}>{mapMoving ? 'Locating…' : 'Confirm Location'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // 🚀 NEW DIAGNOSTIC UI: Split out the specific error conditions
            (isFareLoading || isRouteLoading) ? (
              <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#BEFF00" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontFamily: 'Outfit_500Medium' }}>Calculating fares...</Text>
              </View>
              
            ) : isRouteError ? (
              <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ useRouteEstimate Hook Failed</Text>
                <TouchableOpacity onPress={() => handleBack()} style={[styles.actionBtn, { paddingHorizontal: 24, height: 44, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.actionBtnText, { color: 'white' }]}>Go Back</Text>
                </TouchableOpacity>
              </View>
              
            ) : isFareError ? (
              <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ useFareEstimate Hook Failed</Text>
                <TouchableOpacity onPress={() => handleBack()} style={[styles.actionBtn, { paddingHorizontal: 24, height: 44, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.actionBtnText, { color: 'white' }]}>Go Back</Text>
                </TouchableOpacity>
              </View>
              
            ) : !fareData ? (
              <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ fareData is Null or Empty</Text>
                <TouchableOpacity onPress={() => handleBack()} style={[styles.actionBtn, { paddingHorizontal: 24, height: 44, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.actionBtnText, { color: 'white' }]}>Go Back</Text>
                </TouchableOpacity>
              </View>
              
            ) : !activeFare ? (
              <View style={{ paddingVertical: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: '#FF8080', fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>❌ activeFare Undefined (Vehicle Key Mismatch)</Text>
                <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Selected: {selectedVehicle}</Text>
                <TouchableOpacity onPress={() => handleBack()} style={[styles.actionBtn, { paddingHorizontal: 24, height: 44, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.actionBtnText, { color: 'white' }]}>Go Back</Text>
                </TouchableOpacity>
              </View>

            ) : (
              <View>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => setIsDetailsExpanded(!isDetailsExpanded)} 
                  style={styles.dragHandleContainer}
                >
                  <View style={styles.dragHandleBar} />
                  <Text style={styles.toggleText}>
                    {isDetailsExpanded ? '▼ Hide Fare Breakdown' : '▲ Show Fare Breakdown'}
                  </Text>
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: isDetailsExpanded ? 400 : 180 }}>
                  <View style={styles.infoStrip}>
                    {[
                      { value: isRouteLoading ? '...' : `${displayDistance} km`,  label: 'Distance'  },
                      { value: isRouteLoading ? '...' : `~${displayDuration} min`, label: 'Est. time' },
                      { value: 'UPI',                                               label: 'Payment'   },
                    ].map((item, i, arr) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold' }}>{item.value}</Text>
                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{item.label}</Text>
                        </View>
                        {i < arr.length - 1 && <View style={{ width: 0.5, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
                      </View>
                    ))}
                  </View>

                  {isOutOfZone && isDetailsExpanded && (
                    <View style={{ backgroundColor: 'rgba(255,80,80,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,80,80,0.2)', borderRadius: 12, padding: 14, marginBottom: 12, marginTop: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF8080', fontFamily: 'Outfit_700Bold' }}>⚠️ Service not available</Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular', marginTop: 4, lineHeight: 16 }}>
                        Your pickup is outside Rydo's service area. Please select a spot inside our coverage zones.
                      </Text>
                    </View>
                  )}

                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', marginTop: 14, marginBottom: 8 }}>Choose vehicle</Text>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
                    {VEHICLES.map((v) => {
                      const active = selectedVehicle ? selectedVehicle === v.id : v.id === VEHICLES[0].id;
                      const fare   = fareData?.fares?.[v.id];
                      return (
                        <Pressable
                          key={v.id}
                          onPress={() => setSelectedVehicle(v.id)}
                          style={{ backgroundColor: active ? 'rgba(190,255,0,0.08)' : '#06090A', borderWidth: 0.5, borderColor: active ? 'rgba(190,255,0,0.4)' : 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 11, alignItems: 'center', gap: 4, minWidth: 96 }}
                        >
                          <Text style={{ fontSize: 20 }}>{v.icon}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' }}>{v.label}</Text>
                          
                          <View style={{ alignItems: 'center' }}>
                            {fare?.standardTotal && fare.standardTotal > fare.total && (
                              <Text style={styles.crossedOutPrice}>₹{fare.standardTotal}</Text>
                            )}
                            <Text style={{ fontSize: 12, color: active ? '#BEFF00' : 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_700Bold' }}>
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
                    <View style={styles.fareCard}>
                      {fareRows.map((row, i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>{row.label}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>{row.value}</Text>
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit_400Regular' }}>TDS (Sec 194-O, 1% Config)</Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit_400Regular' }}>₹{activeFare.tds} deduction</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.summaryTotalRow}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>Total Ride Price</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      {activeFare.standardTotal && activeFare.standardTotal > activeFare.total && (
                        <Text style={[styles.crossedOutPrice, { fontSize: 14, marginBottom: 0 }]}>
                          ₹{activeFare.standardTotal}
                        </Text>
                      )}
                      <Text style={{ fontSize: 24, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold' }}>
                        ₹{activeFare.total}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={handleConfirmRide} 
                    disabled={isBookingLive || !!isOutOfZone} 
                    style={[styles.actionBtn, (isBookingLive || !!isOutOfZone) && { opacity: 0.4 }]}
                  >
                    {isBookingLive ? <ActivityIndicator color="#060A07" /> : <Text style={styles.actionBtnText}>Confirm Ride Match</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#06090A' },
  centerPin:    { position: 'absolute', top: '50%', left: '50%', marginTop: -38, marginLeft: -19, alignItems: 'center', zIndex: 99 },
  pinShadow:    { width: 8, height: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 4, marginTop: 1 },
  header:       { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 14, paddingTop: 52 },
  backBtn:      { width: 36, height: 36, backgroundColor: '#101C12', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  searchCard:   { backgroundColor: '#101C12', borderRadius: 18, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06090A', borderRadius: 11, paddingHorizontal: 12, height: 44, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)' },
  activeInput:  { borderColor: '#BEFF00' },
  dot:          { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  input:        { flex: 1, color: '#EEF0E8', fontSize: 14, fontFamily: 'Outfit_500Medium' },
  routePill:    { backgroundColor: '#101C12', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  routeText:    { flex: 1, color: '#EEF0E8', fontSize: 12, fontFamily: 'Outfit_500Medium' },
  autocomplete: { backgroundColor: '#101C12', borderRadius: 16, marginTop: 6, maxHeight: 250, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6 },
  
  setOnMapBtn:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' },
  setOnMapIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(190,255,0,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  setOnMapText: { color: '#BEFF00', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },

  resultRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  resultName:   { color: '#EEF0E8', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  resultSub:    { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },
  drawer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#101C12', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 32, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  drawerTitle:  { color: '#EEF0E8', fontSize: 17, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3, marginTop: 10 },
  drawerSub:    { color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  dragHandleContainer: { width: '100%', alignItems: 'center', paddingVertical: 8, marginBottom: 6 },
  dragHandleBar: { width: 44, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  toggleText:   { color: 'rgba(190,255,0,0.7)', fontSize: 10, fontFamily: 'Outfit_600SemiBold', marginTop: 5, letterSpacing: 0.3 },
  actionBtn:    { backgroundColor: '#BEFF00', borderRadius: 16, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  actionBtnText:{ color: '#060A07', fontSize: 15, fontFamily: 'Outfit_800ExtraBold' },
  infoStrip:    { backgroundColor: '#06090A', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  fareCard:     { marginTop: 12, backgroundColor: '#06090A', borderRadius: 17, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: 13 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)' },

  crossedOutPrice: {
    fontSize: 11,
    color: '#9CA3AF', 
    textDecorationLine: 'line-through', 
    marginBottom: 2,
    fontFamily: 'Outfit_500Medium'
  },
  promoBadge: {
    fontSize: 9,
    color: '#F59E0B', 
    fontFamily: 'Outfit_800ExtraBold',
    marginTop: 3,
    letterSpacing: 0.5
  },

  vehicleMarker: {
    width: 36, 
    height: 36, 
    backgroundColor: '#101C12',
    borderRadius: 18,
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2, 
    borderColor: '#BEFF00', 
    shadowColor: '#BEFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
});