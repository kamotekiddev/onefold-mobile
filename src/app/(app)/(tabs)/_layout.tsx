import { Tabs } from "expo-router/js-tabs"
import { SymbolView } from "expo-symbols"

import { usePalette } from "@/constants/theme"

export default function TabLayout() {
  const p = usePalette()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.textSecondary,
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        headerStyle: { backgroundColor: p.surface },
        headerTintColor: p.text,
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Routines",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "square.grid.2x2",
                android: "view_list",
                web: "view_list",
              }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "clock.arrow.circlepath",
                android: "history",
                web: "history",
              }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "slider.horizontal.3",
                android: "tune",
                web: "tune",
              }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}
