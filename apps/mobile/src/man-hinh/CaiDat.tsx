// ═══════════════════════════════════════════════════════════════════════════
// Màn hình Cài đặt — hiển thị vai trò hiện tại + nút đổi vai trò + theme
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, List, Switch, Button, Card, Divider, useTheme } from 'react-native-paper';
import { dungCuaHangUI } from '../store/cua-hang-ui';
import { dungCuaHangAuth, NHAN_VAI_TRO } from '../store/cua-hang-auth';

export default function ManHinhCaiDat() {
  const { colors } = useTheme();
  const { chuDe, doiChuDe } = dungCuaHangUI();
  const { vaiTroHienTai, thoatVaiTro } = dungCuaHangAuth();

  function xuLyDoiVaiTro() {
    // Root navigator sẽ tự switch sang stack Auth khi vaiTroHienTai = null
    thoatVaiTro();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.noiDung}>
        {/* Vai trò */}
        {vaiTroHienTai && (
          <Card style={styles.the}>
            <Card.Title
              title={NHAN_VAI_TRO[vaiTroHienTai]}
              subtitle="Vai trò đang sử dụng"
              left={(p) => <List.Icon {...p} icon="account-circle" />}
            />
            <Card.Actions>
              <Button mode="contained-tonal" onPress={xuLyDoiVaiTro} icon="account-switch">
                Đổi vai trò
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* Giao diện */}
        <Card style={styles.the}>
          <Card.Title title="Giao diện" left={(p) => <List.Icon {...p} icon="palette" />} />
          <Card.Content>
            <View style={styles.hangNgang}>
              <Text variant="bodyMedium">Chế độ tối</Text>
              <Switch value={chuDe === 'toi'} onValueChange={doiChuDe} />
            </View>
          </Card.Content>
        </Card>

        {/* Thông tin */}
        <Card style={styles.the}>
          <Card.Title title="Thông tin ứng dụng" left={(p) => <List.Icon {...p} icon="information" />} />
          <Card.Content>
            <List.Item title="Phiên bản" right={() => <Text>0.2.0</Text>} />
            <Divider />
            <List.Item title="Nhà phát triển" right={() => <Text>CP Lai Trường Sơn</Text>} />
            <Divider />
            <List.Item title="Engine" right={() => <Text>@lts/bang-tinh-gia</Text>} />
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  noiDung: { padding: 16, gap: 12 },
  the: { marginBottom: 8 },
  hangNgang: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
