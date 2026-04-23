import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Card, Icon } from 'react-native-paper';

export default function ManHinhCauHinh() {
  const { colors } = useTheme();
  return (
    <View style={[styles.boc, { backgroundColor: colors.background }]}>
      <Card style={styles.the}>
        <Card.Content style={styles.canGiua}>
          <Icon source="cog" size={64} color={colors.primary} />
          <Text variant="titleMedium" style={styles.tieuDe}>Cấu hình định mức</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
            Sắp ra mắt — Phase 2 (vật liệu, hằng số, lợi nhuận)
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  boc: { flex: 1, padding: 16 },
  the: { marginTop: 32 },
  canGiua: { alignItems: 'center', padding: 24, gap: 12 },
  tieuDe: { textAlign: 'center' },
});
