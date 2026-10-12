import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { usePalette } from '@/constants/theme';

export default function TabLayout() {
  const p = usePalette();
  return <Tabs screenOptions={{ tabBarActiveTintColor: p.accent, tabBarInactiveTintColor: p.textSecondary, tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.border }, headerStyle: { backgroundColor: p.surface }, headerTintColor: p.text, tabBarLabelStyle: { fontSize: 12 } }}>
    <Tabs.Screen name="index" options={{ title: 'Routines', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▤</Text> }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◷</Text> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⚙</Text> }} />
  </Tabs>;
}
