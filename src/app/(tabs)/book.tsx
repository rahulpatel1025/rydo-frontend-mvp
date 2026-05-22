// src/app/(tabs)/book.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Pressable,
  ActivityIndicator, StyleSheet, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Svg, Path, Circle } from 'react-native-svg';
import { useFareEstimate, VehicleType } from '../../features/booking/api/useFareEstimate';
import { SearchIcon } from '../../components/ui/Icons';

// ── Inline icons (removes dependency on PinIcon props issue) ──────────────────
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

// PinIcon with explicit color prop — no dependency on Icons.tsx
const PinIcon = ({ color = '#BEFF00' }: { color?: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
      fill={color}
      opacity={0.9}
    />
    <Circle cx={12} cy={9} r={3} fill="#06090A" />
  </Svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStep = 'select_pickup' | 'select_dropoff' | 'route_preview';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SILVASSA_REGION = {
  latitude:      20.2760,
  longitude:     73.0084,
  latitudeDelta:  0.01,
  longitudeDelta: 0.01,
};

const MOCK_LOCATIONS = [
  { id: '1', name: 'Silvassa Bus Station',              latitude: 20.2712, longitude: 73.0021 },
  { id: '2', name: 'Baldevi Temple, Silvassa',          latitude: 20.2785, longitude: 73.0124 },
  { id: '3', name: 'Vapi Railway Station',              latitude: 20.3714, longitude: 72.9074 },
  { id: '4', name: 'Tokarkhada Primary Health Center',  latitude: 20.2645, longitude: 73.0052 },
  { id: '5', name: 'Daman Beach',                       latitude: 20.4147, longitude: 72.8328 },
  { id: '6', name: 'Bhilad Junction',                   latitude: 20.3492, longitude: 72.9627 },
];

const VEHICLES: { id: VehicleType; label: string; icon: string }[] = [
  { id: 'bike',        label: 'Bike',       icon: '🛵' },
  { id: 'auto',        label: 'Auto',       icon: '🛺' },
  { id: 'shared_auto', label: 'Share Auto', icon: '🚐' },
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BookScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [step, setStep]                   = useState<WorkflowStep>('select_pickup');
  const [searchQuery, setSearchQuery]     = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mapMoving, setMapMoving]         = useState(false);
  const [pickup, setPickup]               = useState<LocationData | null>(null);
  const [dropoff, setDropoff]             = useState<LocationData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  const [currentRegion, setCurrentRegion] = useState(SILVASSA_REGION);

  const { data: fareData, isLoading: isFareLoading } = useFareEstimate();

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const r = {
          latitude:      loc.coords.latitude,
          longitude:     loc.coords.longitude,
          latitudeDelta:  0.006,
          longitudeDelta: 0.006,
        };
        setCurrentRegion(r);
        mapRef.current?.animateToRegion(r, 500);
      }
    })();
  }, []);

  // Fit map to route when both points set
  useEffect(() => {
    if (step === 'route_preview' && pickup && dropoff) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([pickup, dropoff], {
          edgePadding: { top: 120, right: 50, bottom: 420, left: 50 },
          animated: true,
        });
      }, 400);
    }
  }, [step, pickup, dropoff]);

  const filteredResults = MOCK_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSearchResult = (item: typeof MOCK_LOCATIONS[0]) => {
    const r = { latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 };
    setCurrentRegion(r);
    mapRef.current?.animateToRegion(r, 800);
    setIsSearchFocused(false);
    setSearchQuery('');

    if (step === 'select_pickup') {
      setPickup({ latitude: item.latitude, longitude: item.longitude, address: item.name });
    } else {
      setDropoff({ latitude: item.latitude, longitude: item.longitude, address: item.name });
    }
  };

  const handleConfirmLocation = () => {
    if (step === 'select_pickup') {
      setPickup({
        latitude:  currentRegion.latitude,
        longitude: currentRegion.longitude,
        address:   pickup?.address ?? 'Selected Pickup',
      });
      setStep('select_dropoff');
      setIsSearchFocused(true);
    } else if (step === 'select_dropoff') {
      setDropoff({
        latitude:  currentRegion.latitude,
        longitude: currentRegion.longitude,
        address:   dropoff?.address ?? 'Selected Destination',
      });
      setStep('route_preview');
    }
  };

  const handleBack = () => {
    if (step === 'route_preview') { setStep('select_dropoff'); }
    else if (step === 'select_dropoff') { setStep('select_pickup'); }
    else { router.back(); }
  };

  if (isFareLoading || !fareData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  const activeFare = fareData.fares[selectedVehicle];

  const fareRows = [
    { label: 'Base fare (incl. 2 km)',                                                                  value: `₹${activeFare.base}` },
    { label: selectedVehicle === 'shared_auto' ? 'Per seat / km' : `Distance (${activeFare.chargeableKm} km × ₹${activeFare.perKmRate})`, value: `₹${activeFare.distFare}` },
    { label: 'Platform fee (12%)',                                                                       value: `₹${activeFare.platformFee}` },
    ...(activeFare.nightSurcharge > 0 ? [{ label: 'Night surcharge (10%)', value: `₹${activeFare.nightSurcharge}` }] : []),
    ...(activeFare.waitingFare    > 0 ? [{ label: 'Waiting charge',        value: `₹${activeFare.waitingFare}`    }] : []),
  ];

  const pinColor = step === 'select_pickup' ? '#BEFF00' : '#FF453A';

  return (
    <View style={styles.container}>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={currentRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChange={() => setMapMoving(true)}
        onRegionChangeComplete={(r) => { setMapMoving(false); setCurrentRegion(r); }}
      >
        {step === 'route_preview' && pickup && dropoff && (
          <>
            <Marker coordinate={pickup}  pinColor="#BEFF00" title="Pickup" />
            <Marker coordinate={dropoff} pinColor="#FF453A" title="Drop-off" />
            <Polyline coordinates={[pickup, dropoff]} strokeColor="#BEFF00" strokeWidth={3} lineDashPattern={[6, 4]} />
          </>
        )}
      </MapView>

      {/* ── Center Pin (only during location selection) ── */}
      {step !== 'route_preview' && !isSearchFocused && (
        <View style={styles.centerPin} pointerEvents="none">
          <View style={{ transform: [{ translateY: mapMoving ? -10 : 0 }] }}>
            <PinIcon color={pinColor} />
          </View>
          <View style={[styles.pinShadow, mapMoving && { opacity: 0.3, transform: [{ scaleX: 0.7 }] }]} />
        </View>
      )}

      {/* ── Floating Header ── */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.4 }}>
            {step === 'route_preview' ? 'Plan your ride' : 'Select location'}
          </Text>
        </View>

        {/* Search inputs */}
        {step !== 'route_preview' && (
          <View style={styles.searchCard}>
            {/* Pickup input */}
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

            {/* Dropoff input — only after pickup set */}
            {step !== 'select_pickup' && (
              <View style={[styles.inputRow, step === 'select_dropoff' && styles.activeInput, { marginTop: 8 }]}>
                <View style={[styles.dot, { backgroundColor: '#FF453A' }]} />
                <TextInput
                  style={styles.input}
                  placeholder="Where to?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={dropoff && step !== 'select_dropoff' ? dropoff.address : searchQuery}
                  onChangeText={(t) => { setSearchQuery(t); if (dropoff) setDropoff(null); }}
                  onFocus={() => { setStep('select_dropoff'); setIsSearchFocused(true); }}
                  autoFocus={step === 'select_dropoff'}
                />
              </View>
            )}
          </View>
        )}

        {/* Route summary pill in preview mode */}
        {step === 'route_preview' && pickup && dropoff && (
          <View style={styles.routePill}>
            <View style={[styles.dot, { backgroundColor: '#BEFF00' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{pickup.address}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', marginHorizontal: 4 }}>→</Text>
            <Text style={styles.routeText} numberOfLines={1}>{dropoff.address}</Text>
            <TouchableOpacity onPress={() => setStep('select_pickup')} style={{ marginLeft: 8 }}>
              <SwapIcon />
            </TouchableOpacity>
          </View>
        )}

        {/* Autocomplete dropdown */}
        {isSearchFocused && searchQuery.length > 0 && (
          <View style={styles.autocomplete}>
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectSearchResult(item)}>
                  <SearchIcon />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultSub}>Silvassa region</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </SafeAreaView>

      {/* ── Bottom Drawer ── */}
      {!isSearchFocused && (
        <View style={styles.drawer}>

          {step !== 'route_preview' ? (
            // Confirm location state
            <View>
              <Text style={styles.drawerTitle}>
                {step === 'select_pickup' ? 'Confirm pickup spot' : 'Confirm destination'}
              </Text>
              <Text style={styles.drawerSub}>Drag the map to pin your exact location.</Text>
              <TouchableOpacity
                onPress={handleConfirmLocation}
                disabled={mapMoving}
                style={[styles.actionBtn, mapMoving && { opacity: 0.5 }]}
              >
                <Text style={styles.actionBtnText}>
                  {mapMoving ? 'Locating…' : 'Confirm Location'}
                </Text>
              </TouchableOpacity>
            </View>

          ) : (
            // Route preview + fare state
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>

              {/* Route info strip */}
              <View style={styles.infoStrip}>
                {[
                  { value: `${fareData.distance_km} km`,         label: 'Distance'  },
                  { value: `~${fareData.duration_minutes} min`,   label: 'Est. time' },
                  { value: 'UPI',                                 label: 'Payment'   },
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

              {/* Launch rate badge */}
              {activeFare.isLaunchRate && (
                <View style={styles.launchBadge}>
                  <Text style={{ fontSize: 10, color: '#BEFF00', fontFamily: 'Outfit_600SemiBold' }}>
                    🎉 Launch rates — save up to 33% vs standard fares
                  </Text>
                </View>
              )}

              {/* Vehicle selector */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', marginTop: 14, marginBottom: 8 }}>Choose vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                {VEHICLES.map((v) => {
                  const active = selectedVehicle === v.id;
                  const fare   = fareData.fares[v.id];
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVehicle(v.id)}
                      style={{ backgroundColor: active ? 'rgba(190,255,0,0.08)' : '#06090A', borderWidth: 0.5, borderColor: active ? 'rgba(190,255,0,0.4)' : 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 11, alignItems: 'center', gap: 4, minWidth: 88 }}
                    >
                      <Text style={{ fontSize: 20 }}>{v.icon}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold' }}>{v.label}</Text>
                      <Text style={{ fontSize: 11, color: active ? '#BEFF00' : 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>
                        ₹{fare.total}{v.id === 'shared_auto' ? '/seat' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Fare breakdown */}
              <View style={styles.fareCard}>
                {fareRows.map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>{row.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>{row.value}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit_400Regular' }}>TDS (Sec 194-O, 1%)</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit_400Regular' }}>₹{activeFare.tds} driver deduction</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold' }}>You pay</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#BEFF00', fontFamily: 'Outfit_800ExtraBold' }}>₹{activeFare.grossFare}</Text>
                </View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'Outfit_400Regular', textAlign: 'right', marginTop: 2 }}>
                  Driver earns ₹{activeFare.netToDriver} after platform fee
                </Text>
              </View>

              {/* Confirm */}
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/track')}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>Confirm Ride</Text>
              </TouchableOpacity>
            </ScrollView>
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
  autocomplete: { backgroundColor: '#101C12', borderRadius: 16, marginTop: 6, maxHeight: 220, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6 },
  resultRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  resultName:   { color: '#EEF0E8', fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  resultSub:    { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },
  drawer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#101C12', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  drawerTitle:  { color: '#EEF0E8', fontSize: 17, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
  drawerSub:    { color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 5, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  actionBtn:    { backgroundColor: '#BEFF00', borderRadius: 16, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  actionBtnText:{ color: '#060A07', fontSize: 15, fontFamily: 'Outfit_800ExtraBold' },
  infoStrip:    { backgroundColor: '#06090A', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  launchBadge:  { marginTop: 8, backgroundColor: 'rgba(190,255,0,0.07)', borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.2)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  fareCard:     { marginTop: 12, backgroundColor: '#06090A', borderRadius: 17, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', padding: 13 },
});