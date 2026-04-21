import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { dungStore } from '../store/store-nhap-lieu';

export default function ManHinhCaiDat() {
  const { chuDeGiao, doiChuDe, taiCauHinhTuMayChu, dangTai, loiKetNoi } = dungStore();
  const [diaChiMayChu, datDiaChiMayChu] = useState('http://192.168.1.10:3000');

  const xuLyTaiCauHinh = async () => {
    await taiCauHinhTuMayChu(diaChiMayChu);
    if (!loiKetNoi) {
      Alert.alert('✅ Thành công', 'Đã tải cấu hình mới từ máy chủ');
    }
  };

  return (
    <ScrollView style={styles.cuon} contentContainerStyle={styles.noiDung}>
      <Text style={styles.tieuDe}>Cài Đặt</Text>

      {/* Giao diện */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>Giao diện</Text>
        <View style={styles.hangNgang}>
          <Text style={styles.nhan}>Chế độ sáng / tối</Text>
          <TouchableOpacity style={styles.nutDoiChuDe} onPress={doiChuDe}>
            <Text style={styles.chuNutDoiChuDe}>
              {chuDeGiao === 'sang' ? '☀️ Sáng' : '🌙 Tối'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Kết nối máy chủ */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>Kết nối máy chủ</Text>
        <Text style={styles.moTa}>
          Đồng bộ vật liệu & hằng số từ ứng dụng web LTS Pricing (cùng mạng LAN).
        </Text>

        <Text style={styles.nhan}>Địa chỉ máy chủ</Text>
        <TextInput
          style={styles.oNhap}
          value={diaChiMayChu}
          onChangeText={datDiaChiMayChu}
          placeholder="http://192.168.1.10:3000"
          autoCapitalize="none"
          keyboardType="url"
        />

        {loiKetNoi && (
          <Text style={styles.chuLoi}>{loiKetNoi}</Text>
        )}

        <TouchableOpacity
          style={[styles.nut, dangTai && styles.nutDisabled]}
          onPress={xuLyTaiCauHinh}
          disabled={dangTai}
        >
          <Text style={styles.chuNut}>
            {dangTai ? '⏳ Đang tải...' : '🔄 Tải cấu hình từ máy chủ'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thông tin ứng dụng */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>Thông tin ứng dụng</Text>
        <View style={styles.hangThongTin}>
          <Text style={styles.nhanThongTin}>Phiên bản</Text>
          <Text style={styles.giaTriThongTin}>0.1.0</Text>
        </View>
        <View style={styles.hangThongTin}>
          <Text style={styles.nhanThongTin}>Nhà phát triển</Text>
          <Text style={styles.giaTriThongTin}>Công ty CP Lai Trường Sơn</Text>
        </View>
        <View style={styles.hangThongTin}>
          <Text style={styles.nhanThongTin}>Engine</Text>
          <Text style={styles.giaTriThongTin}>@lts/bang-tinh-gia</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cuon: { flex: 1, backgroundColor: '#f8fafc' },
  noiDung: { padding: 16, paddingBottom: 40 },
  tieuDe: { fontSize: 24, fontWeight: '700', color: '#1e3a5f', marginBottom: 16, textAlign: 'center' },
  the: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  tieuDeThe: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
  moTa: { fontSize: 13, color: '#6b7280', marginBottom: 8, lineHeight: 20 },
  nhan: { fontSize: 13, color: '#6b7280', marginBottom: 4, marginTop: 8 },
  oNhap: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
  },
  hangNgang: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutDoiChuDe: {
    backgroundColor: '#f3f4f6', borderRadius: 8, padding: 8,
    paddingHorizontal: 12,
  },
  chuNutDoiChuDe: { fontSize: 14, color: '#374151' },
  chuLoi: { color: '#dc2626', fontSize: 13, marginTop: 6 },
  nut: {
    backgroundColor: '#3b82f6', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 12,
  },
  nutDisabled: { backgroundColor: '#93c5fd' },
  chuNut: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  hangThongTin: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  nhanThongTin: { fontSize: 13, color: '#6b7280' },
  giaTriThongTin: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
