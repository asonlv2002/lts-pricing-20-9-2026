// ═══════════════════════════════════════════════════════════════════════════
// Bố cục gốc — PaperProvider + SafeAreaProvider + StatusBar core
// Thay thế app/_layout.tsx (expo-router) sau khi gỡ Expo
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { dungCuaHangUI } from './src/store/cua-hang-ui';
import { layChuDe } from './src/lib/chu-de';
import DieuHuongGoc from './src/dieu-huong/DieuHuongGoc';

export default function App() {
  const chuDe = dungCuaHangUI((s) => s.chuDe);
  const theme = layChuDe(chuDe);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar barStyle={chuDe === 'toi' ? 'light-content' : 'dark-content'} />
        <DieuHuongGoc />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
