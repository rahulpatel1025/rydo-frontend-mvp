// src/app/(tabs)/index.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, StyleSheet, TextInput, FlatList, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

// Imports from our cleanly separated architecture
import { useHomeData, VehicleType } from '../../features/booking/api/useHomeData';
import { useNearbyDrivers, NearbyDriver } from '../../features/booking/api/useNearbyDrivers';
import { useLocationSearch, PlaceSearchResult } from '../../features/booking/api/useLocationSearch'; 
import { SearchIcon, PlusIcon, BikeIcon, AutoIcon, SharedAutoIcon } from '../../components/ui/Icons';
import { themeConfig } from '../../theme'; // Import your theme dictionary

export default function HomeScreen() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  const [region, setRegion] = useState({
    latitude: 20.2760,
    longitude: 73.0084,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  // ── Theme Hook ──
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  // ── Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch home static config data
  const { data, isLoading, isError } = useHomeData();

  // Fetch live nearby drivers based on current region
  const { data: nearbyData } = useNearbyDrivers(
    { lat: region.latitude, lng: region.longitude },
    5,
    20
  );
  const nearbyDrivers: NearbyDriver[] = nearbyData?.nearby_drivers ?? [];

  // ── Debounce effect for Search ──
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ── Fetch Real Mapbox Locations ──
  const { data: searchResults = [], isLoading: isSearchLoading } = useLocationSearch(
    debouncedQuery,
    region.latitude,
    region.longitude
  );

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          ...region,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // ── Dynamic Tag Colors ──
  const tagColors = {
    primary: { bg: theme.accentSoft,  text: theme.accent },
    faint:   { bg: theme.border,      text: theme.textSub },
    muted:   { bg: theme.border,      text: theme.textSub },
  };

  const handleSelectSearchResult = (item: PlaceSearchResult) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    router.push('/(tabs)/book');
  };

  // Loading State
  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  // Error / Out of Service Area State
  if (isError || !data?.is_serviceable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>
          RYDO is not available in your area yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Greeting ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <Text style={{ fontSize: 12, color: theme.textSub, fontFamily: 'Outfit_400Regular' }}>
            Good afternoon
          </Text>
          <Text style={{ fontSize: 23, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.5, marginTop: 3, lineHeight: 28 }}>
            Where to, Rahul?
          </Text>
        </View>

        {/* ── Search Bar & Overlay ── */}
        <View style={{ marginHorizontal: 14, marginTop: 12, zIndex: 50 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{ flex: 1, backgroundColor: theme.card, borderWidth: 0.5, borderColor: isSearchFocused ? theme.accent : theme.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <SearchIcon color={isSearchFocused ? theme.accent : theme.textSub} />
              <TextInput
                style={{ fontSize: 13, color: theme.text, fontFamily: 'Outfit_400Regular', flex: 1 }}
                placeholder="Search destination…"
                placeholderTextColor={theme.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/book')}
              style={{ width: 44, height: 44, backgroundColor: theme.accent, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Note: Ensure PlusIcon supports 'color' prop if it throws an error */}
              <PlusIcon color={theme.background} /> 
            </TouchableOpacity>
          </View>

          {/* Autocomplete Dropdown over the Map */}
          {isSearchFocused && searchQuery.length > 0 && (
            <View style={[styles.autocomplete, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {isSearchLoading ? (
                <ActivityIndicator size="small" color={theme.accent} style={{ padding: 20 }} />
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.place_id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.resultRow, { borderBottomColor: theme.border }]} onPress={() => handleSelectSearchResult(item)}>
                      <SearchIcon color={theme.textSub} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.resultName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.resultSub, { color: theme.textSub }]} numberOfLines={1}>{item.address}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>

        {/* ── Live Map Preview Block ── */}
        <View style={{ marginHorizontal: 14, marginTop: 11, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: theme.border, height: 200 }}>
          <MapView 
            provider={PROVIDER_DEFAULT} 
            style={{ flex: 1 }} 
            region={region} 
            showsUserLocation={true}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {/* ── Render Live Driver Map Pins ── */}
            {nearbyDrivers.map((driver) => (
              <Marker
                key={driver.driver_id}
                coordinate={{
                  latitude:  driver.latitude,
                  longitude: driver.longitude,
                }}
              >
                <View style={[styles.driverPin, { backgroundColor: theme.card, borderColor: theme.accent, shadowColor: theme.accent }]}>
                  <Text style={{ fontSize: 12 }}>
                    {driver.ride_type === 'BIKE' ? '🛵' : '🛺'}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>

        {/* ── Quick Routes (Dynamic) ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', letterSpacing: -0.2 }}>Quick routes</Text>
          <Text style={{ fontSize: 11, color: theme.accent, fontFamily: 'Outfit_600SemiBold' }}>See all</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 7, paddingBottom: 4 }}>
          {data.quickRoutes.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push('/(tabs)/book')}
              style={{ backgroundColor: theme.card, borderWidth: 0.5, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold' }}>
                {r.from} → {r.to}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                {r.km} km · from ₹{r.from_price}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Vehicle Selection (Dynamic) ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, fontFamily: 'Outfit_700Bold', letterSpacing: -0.2 }}>Choose your ride</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 14 }}>
          {data.vehicles.map((v) => {
            const active = selectedVehicle === v.id;
            const tag = tagColors[v.tagStyle as keyof typeof tagColors];
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelectedVehicle(v.id)}
                style={{
                  flex: 1,
                  backgroundColor: active ? theme.accentSoft : theme.card,
                  borderWidth: 0.5,
                  borderColor: active ? theme.accent : theme.border,
                  borderRadius: 17,
                  paddingVertical: 13,
                  paddingHorizontal: 7,
                  alignItems: 'center',
                }}
              >
                {v.id === 'bike'        && <BikeIcon active={active} theme={theme} />}
                {v.id === 'auto'        && <AutoIcon active={active} theme={theme} />}
                {v.id === 'shared_auto' && <SharedAutoIcon active={active} theme={theme} />}
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold', marginTop: 7, letterSpacing: -0.3 }}>
                  ₹{v.price}
                </Text>
                <Text style={{ fontSize: 10, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                  {v.label}
                </Text>
                <View style={{ backgroundColor: tag.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginTop: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: tag.text, fontFamily: 'Outfit_700Bold' }}>
                    {v.tag}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Book Now ── */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/book')}
          style={{ backgroundColor: theme.accent, borderRadius: 17, marginHorizontal: 14, marginBottom: 24, paddingVertical: 17, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.background, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 }}>
            Book Now — Just 2 Taps
          </Text>
        </TouchableOpacity>

        {/* ── Ridzo Brand Footer ── */}
        <View style={styles.brandFooter}>
          <View style={[styles.brandDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.brandWordmark, { color: theme.text }]}>ridzo</Text>
          <Text style={[styles.brandTagline, { color: theme.textSub }]}>
            your ride companion,{'\n'}born in Silvassa.
          </Text>
          <View style={[styles.brandBadge, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
            <Text style={[styles.brandBadgeText, { color: theme.accent }]}>🌿  made for silvassa, by silvassa</Text>
          </View>
          <View style={{ height: 28 }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  driverPin: {
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5, 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  autocomplete: {
    position: 'absolute', 
    top: 52, 
    left: 0, 
    right: 52, 
    borderRadius: 16, 
    maxHeight: 220, 
    borderWidth: 0.5, 
    paddingHorizontal: 6, 
    zIndex: 100, 
    elevation: 10
  },
  resultRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 13, 
    paddingHorizontal: 10, 
    borderBottomWidth: 0.5, 
  },
  resultName: { 
    fontSize: 13, 
    fontFamily: 'Outfit_600SemiBold' 
  },
  resultSub: { 
    fontSize: 10, 
    marginTop: 2 
  },
  brandFooter: {
    marginTop: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  brandDivider: {
    width: 36,
    height: 1,
    borderRadius: 1,
    marginBottom: 22,
  },
  brandWordmark: {
    fontSize: 52,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -3,
    opacity: 0.12,
    textTransform: 'lowercase',
    lineHeight: 54,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 19,
    marginTop: 6,
  },
  brandBadge: {
    marginTop: 14,
    borderWidth: 0.5,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  brandBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.4,
  },
});