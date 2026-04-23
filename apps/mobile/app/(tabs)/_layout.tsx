// ═══════════════════════════════════════════════════════════════════════════
// Bố cục Tab — filter theo vai trò hiện tại; gate redirect nếu chưa chọn
// ═══════════════════════════════════════════════════════════════════════════
import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { dungCuaHangAuth } from '../../src/store/cua-hang-auth';

type TenIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color }: { name: TenIcon; color: string }) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export default function BoCucTab() {
  const { colors } = useTheme();
  const vaiTro = dungCuaHangAuth((s) => s.vaiTroHienTai);

  if (!vaiTro) {
    return <Redirect href="/(auth)/chon-vai-tro" />;
  }

  const laAdmin = vaiTro === 'admin';
  const laSale = vaiTro === 'sale';
  const laPurchase = vaiTro === 'purchase';

  const hienTinhGia = laAdmin || laSale;
  const hienKhachHang = laAdmin || laSale;
  const hienBaoGia = laAdmin || laSale;
  const hienLSX = laAdmin || laPurchase;
  const hienCauHinh = laAdmin;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outline },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tính Giá',
          href: hienTinhGia ? '/(tabs)/' : null,
          tabBarIcon: ({ color }) => <TabIcon name="calculator-variant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="khach-hang"
        options={{
          title: 'Khách hàng',
          href: hienKhachHang ? '/(tabs)/khach-hang' : null,
          tabBarIcon: ({ color }) => <TabIcon name="account-group" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bao-gia"
        options={{
          title: 'Báo giá',
          href: hienBaoGia ? '/(tabs)/bao-gia' : null,
          tabBarIcon: ({ color }) => <TabIcon name="file-document-edit" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lsx"
        options={{
          title: 'LSX',
          href: hienLSX ? '/(tabs)/lsx' : null,
          tabBarIcon: ({ color }) => <TabIcon name="factory" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lich-su"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color }) => <TabIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cau-hinh"
        options={{
          title: 'Cấu hình',
          href: hienCauHinh ? '/(tabs)/cau-hinh' : null,
          tabBarIcon: ({ color }) => <TabIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cai-dat"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => <TabIcon name="account-cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
