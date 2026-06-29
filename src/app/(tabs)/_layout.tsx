// src/app/(tabs)/_layout.tsx  — Bottom Tab Navigator
import { Tabs, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';
import { useEffect } from 'react';

// ✨ IMPORTS FOR PUSH NOTIFICATIONS
import { usePushNotifications } from '../../hooks/usePushNotifications'; // Note: check if folder is 'hook' or 'hooks'
import { apiClient } from '../../lib/apiClient';

// ── Nav Icons ─────────────────────────────────────────────────────────────────
const HomeIcon = ({ active }: { active: boolean }) => {
  const c = active ? '#BEFF00' : 'rgba(255,255,255,0.28)';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H15V15H9V21H4C3.4 21 3 20.6 3 20V10.5Z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
};

const MapIcon = ({ active }: { active: boolean }) => {
  const c = active ? '#BEFF00' : 'rgba(255,255,255,0.28)';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.7 2 6 4.7 6 8C6 12.5 11 18 12 19C13 18 18 12.5 18 8C18 4.7 15.3 2 12 2Z" stroke={c} strokeWidth={1.6} />
      <Circle cx={12} cy={8} r={2} stroke={c} strokeWidth={1.6} />
    </Svg>
  );
};

const ClockIcon = ({ active }: { active: boolean }) => {
  const c = active ? '#BEFF00' : 'rgba(255,255,255,0.28)';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.6} />
      <Path d="M12 7V12.5L15.5 15" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
};

const PersonIcon = ({ active }: { active: boolean }) => {
  const c = active ? '#BEFF00' : 'rgba(255,255,255,0.28)';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={c} strokeWidth={1.6} />
      <Path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
};

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({ state, descriptors, navigation }: any) {
  const tabs = [
    { route: 'index', label: 'Home',  Icon: HomeIcon  },
    { route: 'book',  label: 'Book',  Icon: MapIcon   },
    { route: 'track', label: 'Track', Icon: ClockIcon },
    { route: 'trips', label: 'Trips', Icon: ClockIcon },
    { route: 'profile', label: 'Me',  Icon: PersonIcon },
  ];

  return (
    <View style={{ backgroundColor: '#090D0B', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', paddingBottom: 22, paddingTop: 10 }}>
      {state.routes.map((route: any, index: number) => {
        const tab = tabs.find((t) => t.route === route.name) ?? tabs[0];
        const active = state.index === index;
        const Icon = tab.Icon;
        return (
          <View
            key={route.key}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
            onTouchEnd={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <View style={{ padding: 8, borderRadius: 14 }}>
              <Icon active={active} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: active ? '#BEFF00' : 'rgba(255,255,255,0.28)', fontFamily: active ? 'Outfit_600SemiBold' : 'Outfit_400Regular' }}>
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const router = useRouter();
  const { expoPushToken, notification } = usePushNotifications();

  // ✨ 1. Sync Push Token to Backend
  useEffect(() => {
    if (expoPushToken?.data) {
      console.log("📱 User Push Token Generated:", expoPushToken.data);
      apiClient.put('/users/push-token', { 
        token: expoPushToken.data 
      }).catch(err => console.log("Failed to sync user push token", err.message));
    }
  }, [expoPushToken]);

  // ✨ 2. Global Background Push Notification Listener
  useEffect(() => {
    if (notification) {
      console.log("🚨 USER APP RECEIVED PUSH NOTIFICATION 🚨");
      const payload: any = notification.request.content.data?.request || notification.request.content.data;
      
      // If the driver accepted or arrived, push them to the tracking screen
      if (payload?.status === 'accepted' || payload?.status === 'driver_arrived' || payload?.type === 'status_update') {
        router.push('/(tabs)/track');
      }
    }
  }, [notification]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home'    }} />
      <Tabs.Screen name="book"    options={{ title: 'Book'    }} />
      <Tabs.Screen name="track"   options={{ title: 'Track'   }} />
      <Tabs.Screen name="trips"   options={{ title: 'Trips'   }} />
      <Tabs.Screen name="profile" options={{ title: 'Me'      }} />
    </Tabs>
  );
}