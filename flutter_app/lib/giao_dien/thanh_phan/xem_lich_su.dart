// giao_dien/thanh_phan/xem_lich_su.dart — Lịch sử tính giá
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

class XemLichSu extends StatelessWidget {
  const XemLichSu({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final lichSu = kho.lichSu;

    if (lichSu.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('📋', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text('Chưa có lịch sử tính giá',
              style: TextStyle(fontSize: 14, color: ChuDe.mauNhatTheo(toi))),
          const SizedBox(height: 4),
          Text('Nhập thông tin và nhấn "Tính Giá" để lưu',
              style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi).withAlpha(160))),
        ]),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Row(children: [
            Text('📋', style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text('${lichSu.length} bản ghi',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                    color: ChuDe.mauTruc(toi))),
          ]),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
            itemCount: lichSu.length,
            itemBuilder: (ctx, i) {
              final muc = lichSu[i];
              final laMang = muc.dauVao.loaiSanPham == 'mang';

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: ChuDe.mauMatTheo(toi),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ChuDe.mauVienTheo(toi)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Dòng 1: ngày + tên khách + tên SP
                    Row(children: [
                      Text(muc.ngay,
                          style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
                      const SizedBox(width: 8),
                      if (muc.tenKhach != 'N/A') ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: ChuDe.mauTruc(toi).withAlpha(18),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(muc.tenKhach,
                              style: TextStyle(fontSize: 10, color: ChuDe.mauTruc(toi),
                                  fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Expanded(
                        child: Text(
                          muc.tenSP != 'N/A' ? muc.tenSP : '',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                              color: ChuDe.mauChuTheo(toi)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ]),
                    const SizedBox(height: 4),

                    // Dòng 2: cấu trúc + số lượng
                    Row(children: [
                      Expanded(
                        child: Text(muc.cauTruc,
                            style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi)),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      Text(
                        '${dinhDangSo(muc.soLuong)} ${laMang ? 'm²' : 'túi'}',
                        style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi)),
                      ),
                    ]),
                    const SizedBox(height: 6),

                    // Dòng 3: giá đề xuất + giá chốt + buttons
                    Row(children: [
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Đề xuất',
                            style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi))),
                        Text(dinhDangTien(muc.giaBanCuoi),
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                                color: ChuDe.mauTruc(toi))),
                      ]),
                      const SizedBox(width: 16),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Chốt',
                            style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi))),
                        muc.giaChotGia != null
                            ? Text(dinhDangTien(muc.giaChotGia),
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                                    color: ChuDe.mauXanhTheo(toi)))
                            : Text('Chưa chốt',
                                style: TextStyle(fontSize: 11,
                                    color: ChuDe.mauNhatTheo(toi).withAlpha(160))),
                      ]),
                      const Spacer(),
                      // Nút tải
                      NutNho(
                        nhan: '⬇ Tải',
                        onNhan: () {
                          kho.loadLichSu(muc.id);
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(
                              content: Text('Đã tải đơn hàng'),
                              duration: Duration(seconds: 1),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 6),
                      // Nút xóa
                      IconButton(
                        onPressed: () => _xacNhanXoa(ctx, kho, muc.id),
                        icon: Icon(Icons.delete_outline,
                            size: 18, color: ChuDe.mauNhatTheo(toi)),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        tooltip: 'Xóa',
                      ),
                    ]),
                  ]),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _xacNhanXoa(BuildContext context, KhoChinhLuuTru kho, String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa lịch sử'),
        content: const Text('Bạn có chắc muốn xóa bản ghi này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () {
              kho.xoaLichSu(id);
              Navigator.pop(ctx);
            },
            child: const Text('Xóa', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
