// src/app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserProfile } from '../../features/auth/api/useUserProfile';
import { StarIcon, WalletIcon, PinIcon, BellIcon, HelpIcon } from '../../components/ui/Icons';
import { useAuth } from '../../lib/auth-context'; 
import { themeConfig } from '../../theme'; // Import your theme dictionary

export default function ProfileScreen() {
  const { data, isLoading } = useUserProfile();
  const { signOut } = useAuth(); 

  // Grab the active theme
  const colorScheme = useColorScheme() || 'dark';
  const theme = themeConfig[colorScheme];

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => signOut() }
    ]);
  };

  const menuSections = [
    [ { icon: <WalletIcon color={theme.text} />, label: 'Payment Methods' }, { icon: <PinIcon color={theme.text} centerColor={theme.card} />, label: 'Saved Addresses' } ],
    [ { icon: <BellIcon color={theme.text} />, label: 'Notifications' }, { icon: <HelpIcon color={theme.text} />, label: 'Help & Support' } ],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 18, paddingVertical: 22, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: theme.accentSoft, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 11 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: theme.accent, fontFamily: 'Outfit_800ExtraBold' }}>{data.initials}</Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold' }}>{data.name}</Text>
          <Text style={{ fontSize: 12, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 4 }}>{data.phone}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.accentSoft, borderWidth: 0.5, borderColor: theme.accent, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 5, marginTop: 9 }}>
            <StarIcon color={theme.accent} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accent, fontFamily: 'Outfit_700Bold' }}>{data.tier} · {data.stats.total_rides} trips</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 7, marginHorizontal: 14, marginTop: 14, marginBottom: 7 }}>
          {[ { value: data.stats.total_rides.toString(), label: 'Total rides' }, { value: data.stats.km_covered.toString(), label: 'Km covered' }, { value: `₹${data.stats.saved_inr}`, label: 'Saved' }].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: theme.card, borderRadius: 15, borderWidth: 0.5, borderColor: theme.border, paddingVertical: 13, paddingHorizontal: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: theme.text, fontFamily: 'Outfit_800ExtraBold' }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: theme.textSub, fontFamily: 'Outfit_400Regular', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {menuSections.map((section, si) => (
          <View key={si} style={{ marginHorizontal: 14, marginTop: 6, backgroundColor: theme.card, borderRadius: 19, borderWidth: 0.5, borderColor: theme.border, overflow: 'hidden' }}>
            {section.map((row, ri) => (
              <TouchableOpacity key={ri} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderBottomWidth: ri < section.length - 1 ? 0.5 : 0, borderBottomColor: theme.border }}>
                <View style={{ width: 37, height: 37, borderRadius: 12, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>{row.icon}</View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: theme.text, fontFamily: 'Outfit_500Medium' }}>{row.label}</Text>
                <Text style={{ color: theme.textSub, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout Section */}
        <TouchableOpacity 
          onPress={handleLogout}
          style={{ marginHorizontal: 14, marginTop: 20, marginBottom: 40, backgroundColor: 'rgba(255, 69, 58, 0.08)', borderRadius: 19, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255, 69, 58, 0.2)' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FF453A', fontFamily: 'Outfit_700Bold' }}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}