// ═══════════════════════════════════════════════════════════════════════════
// Màn hình Chọn vai trò
// Người dùng tap 1 trong 3 thẻ (Quản trị / Kinh doanh / Thu mua) để vào app
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme, Icon } from 'react-native-paper';
import { dungCuaHangAuth, NHAN_VAI_TRO, type VaiTro } from '../store/cua-hang-auth';

type MucVaiTro = {
  vaiTro: VaiTro;
  icon: string;
  moTa: string;
  mauNen: string;
};

const DANH_SACH: MucVaiTro[] = [
  {
    vaiTro: 'admin',
    icon: 'shield-crown',
    moTa: 'Toàn quyền: Tính giá, Khách hàng, Báo giá, LSX, Cấu hình',
    mauNen: '#1e40af',
  },
  {
    vaiTro: 'sale',
    icon: 'briefcase-account',
    moTa: 'Tính giá, Khách hàng, Báo giá, Lịch sử',
    mauNen: '#0891b2',
  },
  {
    vaiTro: 'purchase',
    icon: 'truck-fast',
    moTa: 'Lệnh sản xuất, Lịch sử',
    mauNen: '#16a34a',
  },
];

export default function ManHinhChonVaiTro() {
  const { colors } = useTheme();
  const chonVaiTro = dungCuaHangAuth((s) => s.chonVaiTro);

  function xuLyChon(vt: VaiTro) {
    chonVaiTro(vt);
    // Không cần navigate thủ công — root navigator sẽ tự chuyển sang Tabs
    // khi vaiTroHienTai thay đổi (pattern auth flow của React Navigation).
  }

  return (
    <ScrollView style={[styles.boc, { backgroundColor: colors.background }]}>
      <View style={styles.canGiua}>
        <View style={styles.logo}>
          <Text variant="displaySmall" style={{ color: colors.primary, fontWeight: '700' }}>
            LTS Pricing
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
            Tính giá thành bao bì
          </Text>
        </View>

        <Text variant="titleMedium" style={styles.tieuDe}>
          Chọn vai trò để bắt đầu
        </Text>

        {DANH_SACH.map((muc) => (
          <Card
            key={muc.vaiTro}
            style={styles.theVaiTro}
            mode="elevated"
            onPress={() => xuLyChon(muc.vaiTro)}
          >
            <Card.Content style={styles.noiDungThe}>
              <View style={[styles.icon, { backgroundColor: muc.mauNen }]}>
                <Icon source={muc.icon} size={32} color="#ffffff" />
              </View>
              <View style={styles.thongTin}>
                <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                  {NHAN_VAI_TRO[muc.vaiTro]}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: colors.onSurfaceVariant, marginTop: 2 }}
                >
                  {muc.moTa}
                </Text>
              </View>
              <Icon source="chevron-right" size={28} color={colors.onSurfaceVariant} />
            </Card.Content>
          </Card>
        ))}

        <Text variant="bodySmall" style={[styles.chuKy, { color: colors.onSurfaceVariant }]}>
          © Công ty CP Lai Trường Sơn
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  boc: { flex: 1 },
  canGiua: { padding: 24, paddingTop: 64, gap: 12 },
  logo: { alignItems: 'center', marginBottom: 24 },
  tieuDe: { marginBottom: 8, marginTop: 8 },
  theVaiTro: { marginBottom: 4 },
  noiDungThe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thongTin: { flex: 1 },
  chuKy: { textAlign: 'center', marginTop: 32 },
});
