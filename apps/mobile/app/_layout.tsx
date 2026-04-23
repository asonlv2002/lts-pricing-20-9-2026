// ═══════════════════════════════════════════════════════════════════════════
// Bố cục gốc — PaperProvider + Stack. Auth gate dời xuống các group layout
// dùng <Redirect> để tránh lỗi "navigate before mounting".
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { dungCuaHangUI } from '../src/store/cua-hang-ui';
import { layChuDe } from '../src/lib/chu-de';

export default function BoCucGoc() {
  const chuDe = dungCuaHangUI((s) => s.chuDe);
  const theme = layChuDe(chuDe);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={chuDe === 'toi' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
