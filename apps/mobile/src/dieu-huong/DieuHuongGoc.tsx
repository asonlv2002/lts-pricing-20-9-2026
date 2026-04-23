// ═══════════════════════════════════════════════════════════════════════════
// Root navigator — auth flow pattern
// Nếu chưa chọn vai trò → stack Auth (ChonVaiTro)
// Đã chọn vai trò → stack Tabs (app chính)
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { dungCuaHangAuth } from '../store/cua-hang-auth';

import ManHinhChonVaiTro from '../man-hinh/ChonVaiTro';
import BoCucTab from './BoCucTab';

const Stack = createNativeStackNavigator();

export default function DieuHuongGoc() {
  const vaiTro = dungCuaHangAuth((s) => s.vaiTroHienTai);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {vaiTro ? (
          <Stack.Screen name="Tabs" component={BoCucTab} />
        ) : (
          <Stack.Screen name="ChonVaiTro" component={ManHinhChonVaiTro} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
