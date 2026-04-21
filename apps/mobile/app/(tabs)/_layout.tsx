import { Tabs } from 'expo-router';
import React from 'react';

export default function BoCucTab() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tính Giá',
          tabBarLabel: 'Tính Giá',
          tabBarIcon: ({ color }) => <TabIcon emoji="🧮" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lich-su"
        options={{
          title: 'Lịch Sử',
          tabBarLabel: 'Lịch Sử',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cai-dat"
        options={{
          title: 'Cài Đặt',
          tabBarLabel: 'Cài Đặt',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Icon đơn giản dùng emoji (thay bằng react-native-vector-icons sau)
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === '#3b82f6' ? 1 : 0.5 }}>{emoji}</Text>;
}
