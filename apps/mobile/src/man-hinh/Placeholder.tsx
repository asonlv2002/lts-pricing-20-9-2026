// ═══════════════════════════════════════════════════════════════════════════
// Các màn hình placeholder (Báo giá, Khách hàng, LSX, Cấu hình) — Phase tới
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Card, Icon } from 'react-native-paper';

function tao(icon: string, tieuDe: string, ghiChu: string) {
  return function ManHinhPlaceholder() {
    const { colors } = useTheme();
    return (
      <View style={[styles.boc, { backgroundColor: colors.background }]}>
        <Card style={styles.the}>
          <Card.Content style={styles.canGiua}>
            <Icon source={icon} size={64} color={colors.primary} />
            <Text variant="titleMedium" style={styles.tieuDe}>{tieuDe}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
              {ghiChu}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };
}

export const ManHinhBaoGia = tao('file-document-edit', 'Báo giá & Workflow', 'Sắp ra mắt — Phase 3');
export const ManHinhKhachHang = tao('account-group', 'Quản lý Khách hàng', 'Sắp ra mắt — Phase 3');
export const ManHinhLSX = tao('factory', 'Lệnh Sản Xuất', 'Sắp ra mắt — Phase 4 (kèm xuất PDF)');
export const ManHinhCauHinh = tao('cog', 'Cấu hình định mức', 'Sắp ra mắt — Phase 2 (vật liệu, hằng số, lợi nhuận)');

const styles = StyleSheet.create({
  boc: { flex: 1, padding: 16 },
  the: { marginTop: 32 },
  canGiua: { alignItems: 'center', padding: 24, gap: 12 },
  tieuDe: { textAlign: 'center' },
});
