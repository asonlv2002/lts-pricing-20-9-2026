import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { dungStore } from '../store/store-nhap-lieu';

export default function ManHinhTinhGia() {
  const { dauVao, ketQua, capNhatDauVao, luuVaoLichSu } = dungStore();

  const formatTien = (so: number) =>
    so.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  return (
    <ScrollView style={styles.cuon} contentContainerStyle={styles.noiDungCuon}>
      <Text style={styles.tieuDe}>Tính Giá Bao Bì</Text>

      {/* Thông tin sản phẩm */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>Thông tin sản phẩm</Text>

        <Text style={styles.nhan}>Khách hàng</Text>
        <TextInput
          style={styles.oNhap}
          value={dauVao.khachHang}
          onChangeText={(v) => capNhatDauVao({ khachHang: v })}
          placeholder="Tên khách hàng"
        />

        <Text style={styles.nhan}>Tên sản phẩm</Text>
        <TextInput
          style={styles.oNhap}
          value={dauVao.tenSanPham}
          onChangeText={(v) => capNhatDauVao({ tenSanPham: v })}
          placeholder="Tên sản phẩm"
        />
      </View>

      {/* Thông số kỹ thuật */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>Thông số kỹ thuật</Text>

        <View style={styles.hangNgang}>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Số lượng</Text>
            <TextInput
              style={styles.oNhap}
              value={dauVao.soLuong.toString()}
              onChangeText={(v) => capNhatDauVao({ soLuong: parseFloat(v) || 0 })}
              keyboardType="numeric"
              placeholder="10000"
            />
          </View>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Số màu</Text>
            <TextInput
              style={styles.oNhap}
              value={(dauVao.soMau ?? '').toString()}
              onChangeText={(v) => capNhatDauVao({ soMau: parseInt(v) || 0 })}
              keyboardType="numeric"
              placeholder="4"
            />
          </View>
        </View>

        <View style={styles.hangNgang}>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Khổ trải (mm)</Text>
            <TextInput
              style={styles.oNhap}
              value={(dauVao.khoTrai * 1000).toString()}
              onChangeText={(v) => capNhatDauVao({ khoTrai: (parseFloat(v) || 0) / 1000 })}
              keyboardType="numeric"
              placeholder="300"
            />
          </View>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Bước cắt (mm)</Text>
            <TextInput
              style={styles.oNhap}
              value={(dauVao.buocCat * 1000).toString()}
              onChangeText={(v) => capNhatDauVao({ buocCat: (parseFloat(v) || 0) / 1000 })}
              keyboardType="numeric"
              placeholder="400"
            />
          </View>
        </View>
      </View>

      {/* Kết quả */}
      {ketQua && (
        <View style={[styles.the, styles.theKetQua]}>
          <Text style={styles.tieuDeThe}>Kết quả tính giá</Text>

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanKetQua}>Cấu trúc vật liệu</Text>
            <Text style={styles.giaTriKetQua}>{ketQua.chuoiCauTruc}</Text>
          </View>

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanKetQua}>Tổng diện tích</Text>
            <Text style={styles.giaTriKetQua}>{ketQua.tongDienTich.toFixed(1)} m²</Text>
          </View>

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanKetQua}>Chi phí/đơn vị</Text>
            <Text style={styles.giaTriKetQua}>{formatTien(ketQua.chiPhiDonVi)}</Text>
          </View>

          <View style={styles.phanCach} />

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanGiaCuoi}>Giá đề xuất / {dauVao.loaiSanPham === 'mang' ? 'm²' : 'túi'}</Text>
            <Text style={styles.giaTriGiaCuoi}>{formatTien(ketQua.giaCuoiCung)}</Text>
          </View>

          <TouchableOpacity style={styles.nutLuu} onPress={luuVaoLichSu}>
            <Text style={styles.chuNut}>💾 Lưu vào lịch sử</Text>
          </TouchableOpacity>
        </View>
      )}

      {!ketQua && (
        <View style={[styles.the, styles.theCanhBao]}>
          <Text style={styles.chuCanhBao}>
            ⚠️ Vui lòng chọn vật liệu lớp 1 và điền đầy đủ thông tin để tính giá
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cuon: { flex: 1, backgroundColor: '#f8fafc' },
  noiDungCuon: { padding: 16, paddingBottom: 40 },
  tieuDe: { fontSize: 24, fontWeight: '700', color: '#1e3a5f', marginBottom: 16, textAlign: 'center' },
  the: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  theKetQua: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  theCanhBao: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  tieuDeThe: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
  nhan: { fontSize: 13, color: '#6b7280', marginBottom: 4, marginTop: 8 },
  oNhap: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
  },
  hangNgang: { flexDirection: 'row', gap: 12 },
  oNhapNua: { flex: 1 },
  hangKetQua: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nhanKetQua: { fontSize: 13, color: '#6b7280' },
  giaTriKetQua: { fontSize: 13, fontWeight: '500', color: '#374151' },
  phanCach: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  nhanGiaCuoi: { fontSize: 15, fontWeight: '600', color: '#1e3a5f' },
  giaTriGiaCuoi: { fontSize: 20, fontWeight: '700', color: '#3b82f6' },
  nutLuu: {
    backgroundColor: '#3b82f6', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 12,
  },
  chuNut: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  chuCanhBao: { fontSize: 13, color: '#92400e', textAlign: 'center' },
});
