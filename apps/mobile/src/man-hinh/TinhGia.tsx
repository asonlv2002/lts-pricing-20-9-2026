import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, Modal, FlatList } from 'react-native';
import { dungStore } from '../store/store-nhap-lieu';

// ── Simple Dropdown (thay Picker, không cần native module) ──────────────────
function Dropdown<T extends string | number>({ value, items, onSelect, style }: {
  value: T; items: { label: string; value: T }[]; onSelect: (v: T) => void; style?: any;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.value === value);
  return (
    <View style={style}>
      <TouchableOpacity style={dd.trigger} onPress={() => setOpen(true)}>
        <Text style={dd.triggerText}>{selected?.label ?? '— Chọn —'}</Text>
        <Text style={dd.arrow}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={dd.menu}>
            <FlatList data={items} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => (
              <TouchableOpacity style={[dd.item, item.value === value && dd.itemActive]} onPress={() => { onSelect(item.value); setOpen(false); }}>
                <Text style={[dd.itemText, item.value === value && dd.itemTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const dd = StyleSheet.create({
  trigger: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 14, color: '#111827' },
  arrow: { fontSize: 10, color: '#6b7280' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 40 },
  menu: { backgroundColor: '#fff', borderRadius: 12, maxHeight: 300, overflow: 'hidden' },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemActive: { backgroundColor: '#eff6ff' },
  itemText: { fontSize: 15, color: '#374151' },
  itemTextActive: { color: '#2563eb', fontWeight: '600' },
});

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

      {/* Trục in */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>🖨️ Trục in</Text>

        <View style={styles.hangNgang}>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Dài (m)</Text>
            <TextInput
              style={[styles.oNhap, styles.oNhapDoc]}
              value={dauVao.chieuDaiTruc ? dauVao.chieuDaiTruc.toString() : ''}
              onChangeText={(v) => capNhatDauVao({ chieuDaiTruc: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              placeholder="Tự tính"
            />
          </View>
          <View style={styles.oNhapNua}>
            <Text style={styles.nhan}>Chu vi (m)</Text>
            <TextInput
              style={[styles.oNhap, styles.oNhapDoc]}
              value={dauVao.chuViTruc ? dauVao.chuViTruc.toString() : ''}
              onChangeText={(v) => capNhatDauVao({ chuViTruc: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
              placeholder="Tự tính"
            />
          </View>
        </View>

        <Text style={styles.nhan}>Loại trục</Text>
        <Dropdown
          value={dauVao.loaiTruc ?? 'A'}
          items={[
            { label: 'Trục A', value: 'A' as const },
            { label: 'Trục B', value: 'B' as const },
            { label: 'Trục khác', value: 'custom' as const },
          ]}
          onSelect={(v) => capNhatDauVao({ loaiTruc: v as 'A' | 'B' | 'custom' })}
        />

        {(dauVao.loaiTruc ?? 'A') === 'custom' && (
          <>
            <Text style={styles.nhan}>Đơn giá trục khác (đ/m²)</Text>
            <TextInput
              style={styles.oNhap}
              value={dauVao.giaTrucDonVi ? dauVao.giaTrucDonVi.toString() : ''}
              onChangeText={(v) => capNhatDauVao({ giaTrucDonVi: parseFloat(v) || 0 })}
              keyboardType="numeric"
              placeholder="7300000"
            />
          </>
        )}

        <View style={styles.hangSwitch}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nhanSwitch}>Bao trục</Text>
            <Text style={styles.moTaSwitch}>Phân bổ chi phí trục vào đơn giá (định mức 200.000 m²)</Text>
          </View>
          <Switch
            value={dauVao.baoTruc ?? false}
            onValueChange={(v) => capNhatDauVao({ baoTruc: v })}
          />
        </View>
      </View>

      {/* Thanh toán */}
      <View style={styles.the}>
        <Text style={styles.tieuDeThe}>⏳ Thanh toán</Text>
        <Text style={styles.nhan}>Thời hạn thanh toán</Text>
        <Dropdown
          value={dauVao.ngayThanhToan ?? 30}
          items={[
            { label: '14 ngày', value: 14 },
            { label: '30 ngày', value: 30 },
            { label: '45 ngày', value: 45 },
            { label: '90 ngày', value: 90 },
          ]}
          onSelect={(v) => capNhatDauVao({ ngayThanhToan: v })}
        />
        <Text style={styles.ghiChu}>Lãi suất cấu hình tại máy chủ (Mức + Thêm)</Text>
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

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanKetQua}>
              Lãi vay ({(((ketQua.laiSuatCoBan ?? 0) + (ketQua.laiSuatThem ?? 0)) * 100).toFixed(1)}%/năm · {ketQua.ngayThanhToan} ngày)
            </Text>
            <Text style={styles.giaTriKetQua}>{formatTien(ketQua.laiSuatPerDonVi)}</Text>
          </View>

          {ketQua.chiPhiTruc > 0 && (
            <View style={styles.hangKetQua}>
              <Text style={styles.nhanKetQua}>
                Chi phí bộ trục {(dauVao.baoTruc) ? '(đã bao trục)' : '(tách riêng)'}
              </Text>
              <Text style={styles.giaTriKetQua}>{formatTien(ketQua.chiPhiTruc)}</Text>
            </View>
          )}

          {(dauVao.baoTruc) && ketQua.chiPhiTrucPhanBo > 0 && (
            <View style={styles.hangKetQua}>
              <Text style={styles.nhanKetQua}>Trục phân bổ vào đơn giá</Text>
              <Text style={[styles.giaTriKetQua, { color: '#3b82f6' }]}>+{formatTien(ketQua.chiPhiTrucPhanBo)}</Text>
            </View>
          )}

          <View style={styles.phanCach} />

          <View style={styles.hangKetQua}>
            <Text style={styles.nhanGiaCuoi}>
              Giá đề xuất / {dauVao.loaiSanPham === 'mang' ? 'm²' : 'túi'}
              {dauVao.baoTruc ? ' 📌 Bao trục' : ''}
            </Text>
            <Text style={styles.giaTriGiaCuoi}>{formatTien(ketQua.giaCuoiCung)}</Text>
          </View>

          {!dauVao.baoTruc && ketQua.chiPhiTruc > 0 && (
            <Text style={styles.ghiChuTruc}>
              + Chi phí trục tách riêng: {formatTien(ketQua.chiPhiTruc)}
            </Text>
          )}

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
  oNhapDoc: { color: '#6b7280' },
  hangNgang: { flexDirection: 'row', gap: 12 },
  oNhapNua: { flex: 1 },
  hangSwitch: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  nhanSwitch: { fontSize: 14, fontWeight: '600', color: '#111827' },
  moTaSwitch: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  ghiChu: { fontSize: 12, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' },
  hangKetQua: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nhanKetQua: { fontSize: 13, color: '#6b7280', flex: 1, marginRight: 8 },
  giaTriKetQua: { fontSize: 13, fontWeight: '500', color: '#374151' },
  phanCach: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  nhanGiaCuoi: { fontSize: 15, fontWeight: '600', color: '#1e3a5f', flex: 1, marginRight: 8 },
  giaTriGiaCuoi: { fontSize: 20, fontWeight: '700', color: '#3b82f6' },
  ghiChuTruc: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic', textAlign: 'right' },
  nutLuu: {
    backgroundColor: '#3b82f6', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 12,
  },
  chuNut: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  chuCanhBao: { fontSize: 13, color: '#92400e', textAlign: 'center' },
});
