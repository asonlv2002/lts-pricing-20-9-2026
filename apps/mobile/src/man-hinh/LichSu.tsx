import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { dungStore } from '../store/store-nhap-lieu';
import type { LichSuDonHang } from '@lts/kieu-du-lieu';

export default function ManHinhLichSu() {
  const { lichSu, capNhatDauVao } = dungStore();

  const formatTien = (so: number) =>
    so.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const renderItem = ({ item }: { item: LichSuDonHang }) => (
    <TouchableOpacity
      style={styles.the}
      onPress={() => capNhatDauVao(item.dauVao)}
    >
      <View style={styles.hangTren}>
        <Text style={styles.tenSanPham} numberOfLines={1}>{item.tenSanPham || 'Sản phẩm'}</Text>
        <Text style={styles.ngay}>{item.ngay}</Text>
      </View>
      <Text style={styles.khachHang} numberOfLines={1}>{item.khachHang || 'Khách hàng'}</Text>
      <View style={styles.hangDuoi}>
        <Text style={styles.cauTruc} numberOfLines={1}>{item.cauTruc}</Text>
        <Text style={styles.gia}>{formatTien(item.giaCuoiCung)}</Text>
      </View>
      <Text style={styles.soLuong}>{item.soLuong.toLocaleString('vi-VN')} {item.dauVao.loaiSanPham === 'mang' ? 'm²' : 'túi'}</Text>
    </TouchableOpacity>
  );

  if (lichSu.length === 0) {
    return (
      <View style={styles.rong}>
        <Text style={styles.chuRong}>📋</Text>
        <Text style={styles.chuRongTieuDe}>Chưa có lịch sử</Text>
        <Text style={styles.chuRongMoTa}>Tính giá xong bấm "Lưu vào lịch sử" để hiện ở đây</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={lichSu}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.danhSach}
      ListHeaderComponent={
        <Text style={styles.tieuDe}>Lịch sử tính giá ({lichSu.length} đơn)</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  danhSach: { padding: 16, paddingBottom: 40 },
  tieuDe: { fontSize: 20, fontWeight: '700', color: '#1e3a5f', marginBottom: 12 },
  the: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  hangTren: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tenSanPham: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  ngay: { fontSize: 12, color: '#9ca3af' },
  khachHang: { fontSize: 13, color: '#3b82f6', marginTop: 2 },
  hangDuoi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cauTruc: { fontSize: 12, color: '#6b7280', flex: 1, marginRight: 8 },
  gia: { fontSize: 15, fontWeight: '700', color: '#059669' },
  soLuong: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  rong: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  chuRong: { fontSize: 48, marginBottom: 12 },
  chuRongTieuDe: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  chuRongMoTa: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
