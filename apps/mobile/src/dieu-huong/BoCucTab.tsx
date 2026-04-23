// ═══════════════════════════════════════════════════════════════════════════
// Bottom Tabs — filter theo vai trò hiện tại
// Thay thế app/(tabs)/_layout.tsx (expo-router) bằng @react-navigation/bottom-tabs
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { dungCuaHangAuth } from '../store/cua-hang-auth';

import ManHinhTinhGia from '../man-hinh/TinhGia';
import ManHinhLichSu from '../man-hinh/LichSu';
import ManHinhCaiDat from '../man-hinh/CaiDat';
import {
  ManHinhBaoGia,
  ManHinhKhachHang,
  ManHinhLSX,
  ManHinhCauHinh,
} from '../man-hinh/Placeholder';

type TenIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const Tab = createBottomTabNavigator();

function taoIcon(ten: TenIcon) {
  return ({ color }: { color: string }) => (
    <MaterialCommunityIcons name={ten} size={24} color={color} />
  );
}

export default function BoCucTab() {
  const { colors } = useTheme();
  const vaiTro = dungCuaHangAuth((s) => s.vaiTroHienTai);

  const laAdmin = vaiTro === 'admin';
  const laSale = vaiTro === 'sale';
  const laPurchase = vaiTro === 'purchase';

  const hienTinhGia = laAdmin || laSale;
  const hienKhachHang = laAdmin || laSale;
  const hienBaoGia = laAdmin || laSale;
  const hienLSX = laAdmin || laPurchase;
  const hienCauHinh = laAdmin;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outline },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {hienTinhGia && (
        <Tab.Screen
          name="TinhGia"
          component={ManHinhTinhGia}
          options={{ title: 'Tính Giá', tabBarIcon: taoIcon('calculator-variant') }}
        />
      )}
      {hienKhachHang && (
        <Tab.Screen
          name="KhachHang"
          component={ManHinhKhachHang}
          options={{ title: 'Khách hàng', tabBarIcon: taoIcon('account-group') }}
        />
      )}
      {hienBaoGia && (
        <Tab.Screen
          name="BaoGia"
          component={ManHinhBaoGia}
          options={{ title: 'Báo giá', tabBarIcon: taoIcon('file-document-edit') }}
        />
      )}
      {hienLSX && (
        <Tab.Screen
          name="LSX"
          component={ManHinhLSX}
          options={{ title: 'LSX', tabBarIcon: taoIcon('factory') }}
        />
      )}
      <Tab.Screen
        name="LichSu"
        component={ManHinhLichSu}
        options={{ title: 'Lịch sử', tabBarIcon: taoIcon('history') }}
      />
      {hienCauHinh && (
        <Tab.Screen
          name="CauHinh"
          component={ManHinhCauHinh}
          options={{ title: 'Cấu hình', tabBarIcon: taoIcon('cog') }}
        />
      )}
      <Tab.Screen
        name="CaiDat"
        component={ManHinhCaiDat}
        options={{ title: 'Cài đặt', tabBarIcon: taoIcon('account-cog') }}
      />
    </Tab.Navigator>
  );
}
