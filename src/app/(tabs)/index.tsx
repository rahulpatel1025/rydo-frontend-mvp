// src/app/(tabs)/index.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

// Imports from our cleanly separated architecture
import { useHomeData, VehicleType } from '../../features/booking/api/useHomeData';
import { SearchIcon, PlusIcon, BikeIcon, AutoIcon, SharedAutoIcon } from '../../components/ui/Icons';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('bike');
  const [region, setRegion] = useState({
    latitude: 20.2760,
    longitude: 73.0084,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  // Fetch the data from our React Query hook
  const { data, isLoading, isError } = useHomeData();

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

  const tagColors = {
    primary: { bg: 'rgba(190,255,0,0.1)',  text: '#BEFF00' },
    faint:   { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
    muted:   { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
  };

  // Loading State
  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BEFF00" />
      </SafeAreaView>
    );
  }

  // Error / Out of Service Area State
  if (isError || !data?.is_serviceable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#EEF0E8', fontSize: 18, fontFamily: 'Outfit_700Bold', textAlign: 'center' }}>
          RYDO is not available in your area yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#06090A' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular' }}>
            Good afternoon
          </Text>
          <Text style={{ fontSize: 23, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.5, marginTop: 3, lineHeight: 28 }}>
            Where to, Rahul?
          </Text>
        </View>

        {/* ── Search Bar ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/book')}
            style={{ flex: 1, backgroundColor: '#101C12', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <SearchIcon />
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_400Regular', flex: 1 }}>
              Search destination…
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/book')}
            style={{ width: 44, height: 44, backgroundColor: '#BEFF00', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
          >
            <PlusIcon />
          </TouchableOpacity>
        </View>

        {/* ── Live Map Preview Block ── */}
        <View style={{ marginHorizontal: 14, marginTop: 11, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', height: 200 }}>
          <MapView 
            provider={PROVIDER_DEFAULT} 
            style={{ flex: 1 }} 
            region={region} 
            showsUserLocation={true}
            scrollEnabled={false} // Prevents the map from scrolling when the user is trying to scroll the page
            zoomEnabled={false}
          />
        </View>

        {/* ── Quick Routes (Dynamic) ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: -0.2 }}>Quick routes</Text>
          <Text style={{ fontSize: 11, color: '#BEFF00', fontFamily: 'Outfit_600SemiBold' }}>See all</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 7, paddingBottom: 4 }}>
          {data.quickRoutes.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push('/(tabs)/book')}
              style={{ backgroundColor: '#101C12', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#CDD0C6', fontFamily: 'Outfit_700Bold' }}>
                {r.from} → {r.to}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
                {r.km} km · from ₹{r.from_price}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Vehicle Selection (Dynamic) ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#EEF0E8', fontFamily: 'Outfit_700Bold', letterSpacing: -0.2 }}>Choose your ride</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 14 }}>
          {data.vehicles.map((v) => {
            const active = selectedVehicle === v.id;
            const tag = tagColors[v.tagStyle];
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelectedVehicle(v.id)}
                style={{
                  flex: 1,
                  backgroundColor: active ? 'rgba(190,255,0,0.07)' : '#101C12',
                  borderWidth: 0.5,
                  borderColor: active ? 'rgba(190,255,0,0.4)' : 'rgba(255,255,255,0.08)',
                  borderRadius: 17,
                  paddingVertical: 13,
                  paddingHorizontal: 7,
                  alignItems: 'center',
                }}
              >
                {v.id === 'bike'        && <BikeIcon active={active} />}
                {v.id === 'auto'        && <AutoIcon active={active} />}
                {v.id === 'shared_auto' && <SharedAutoIcon active={active} />}
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', marginTop: 7, letterSpacing: -0.3 }}>
                  ₹{v.price}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit_400Regular', marginTop: 2 }}>
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
          style={{ backgroundColor: '#BEFF00', borderRadius: 17, marginHorizontal: 14, marginBottom: 24, paddingVertical: 17, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#060A07', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 }}>
            Book Now — Just 2 Taps
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}