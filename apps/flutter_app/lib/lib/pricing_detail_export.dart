// ═══════════════════════════════════════════════════════════════════════════
// pricing_detail_export — xuất "Chi tiết bảng tính giá" A4 đầy đủ.
// Mirror web `exportPricingDetailToA4` (pricing-detail-export.ts):
//   • Thương mại → trang thường (không qua bảng đặc tả nâng cao).
//   • Nâng cao   → hero + BẢN GỐC + (Sale) + (Admin) — cột Bảng 2 lọc theo quyền.
//   • Thường     → thông tin chung + bảng CPSX + (Sale) + (Admin).
// Tự tính lại engine từ input (không mutate state) — dùng cho cả màn hiện tại
// lẫn danh sách lịch sử (fallback config session khi không có pin).
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'package:lts_pricing/engine/js_runtime.dart';
import 'package:lts_pricing/engine/models.dart';
import 'package:lts_pricing/lib/engine_advanced.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../theme/format.dart';

/// Dữ liệu 1 sheet cần cho export — gom từ AppState (hiện tại) hoặc HistoryItem.
class ChiTietExportInput {
  final Map<String, dynamic> input;
  final Map<String, dynamic>? saleOverrides;
  final Map<String, dynamic>? adminOverrides;
  final double saleProfitRatePct;
  final double adminProfitRatePct;
  final Map<String, dynamic>? pinnedCpsxNangCao;
  final bool isNangCap;
  final double? chotGia;
  final String customer;
  final String productName;
  final String date;
  const ChiTietExportInput({
    required this.input,
    this.saleOverrides,
    this.adminOverrides,
    this.saleProfitRatePct = 0,
    this.adminProfitRatePct = 0,
    this.pinnedCpsxNangCao,
    this.isNangCap = false,
    this.chotGia,
    required this.customer,
    required this.productName,
    required this.date,
  });
}

class PricingDetailExport {
  PricingDetailExport._();

  static Map<String, Map<String, dynamic>> _ov(Map<String, dynamic>? raw) {
    if (raw == null) return const {};
    final out = <String, Map<String, dynamic>>{};
    for (final e in raw.entries) {
      final v = e.value;
      if (v is Map) out[e.key] = v.cast<String, dynamic>();
    }
    return out;
  }

  /// Build document chi tiết cho [it] với ctx engine cho trước.
  static Future<Uint8List> build({
    required ChiTietExportInput it,
    required List<MaterialDef> materials,
    required AppConstants constants,
    required List<ProfitRow> profitTable,
    required List<SmallWidthMaterialPrice> smallWidthPrices,
    bool coQuyenCoVan = true,
    ({bool coDien, bool coLuong, bool coThoiGian}) cot =
        (coDien: true, coLuong: true, coThoiGian: true),
  }) async {
    final hangSo = it.pinnedCpsxNangCao != null
        ? EngineAdvanced.instance
            .apCpsxNangCaoVaoHangSo(constants, it.pinnedCpsxNangCao!)
        : constants;

    CalculateResult? r0;
    try {
      r0 = EngineService.instance.calculate(
        input: CalculateInput.fromJson(it.input),
        materials: materials,
        constants: hangSo,
        profitTable: profitTable,
        smallWidthPrices: smallWidthPrices,
      );
    } catch (_) {
      r0 = null;
    }

    final doc = pw.Document();
    final laThuongMai = it.input['pricingMode'] == 'commercial';

    if (r0 == null) {
      doc.addPage(pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (_) => pw.Center(
            child: pw.Text('Không thể tính lại bảng giá. Dữ liệu không hợp lệ.')),
      ));
      return doc.save();
    }

    if (laThuongMai) {
      doc.addPage(_trangThuong(r0, it, constants, profitTable));
      return doc.save();
    }

    if (it.isNangCap || it.input['isNangCap'] == true) {
      final kq = EngineAdvanced.instance.tinhKetQuaNangCaoHieuLuc(
        result: r0,
        uniRows: _uniRows(r0, hangSo),
        constants: hangSo,
        materials: materials,
        profitTable: profitTable,
        saleOverrides: const {},
        adminOverrides: const {},
        saleProfitRatePct: 0,
        adminProfitRatePct: 0,
      );
      final hieuLuc = kq['result'];
      final r = hieuLuc is Map
          ? CalculateResult(hieuLuc.cast<String, dynamic>())
          : r0;
      final uniRows = _uniRows(r0, hangSo);
      final saleOv = _ov(it.saleOverrides);
      final adminOv = _ov(it.adminOverrides);

      // Trang 1: hero + giá.
      doc.addPage(_trangHeroNangCao(r, it, hangSo, profitTable));
      // BẢN GỐC.
      doc.addPage(_trangBangNangCao(
          r0, uniRows, hangSo, materials, const {}, const {}, 'BẢN GỐC', cot, coQuyenCoVan, it));
      if (saleOv.isNotEmpty) {
        doc.addPage(_trangBangNangCao(r0, uniRows, hangSo, materials, const {},
            saleOv, '💼 Theo bảng Sale', cot, coQuyenCoVan, it));
      }
      if (adminOv.isNotEmpty) {
        doc.addPage(_trangBangNangCao(r0, uniRows, hangSo, materials, saleOv,
            adminOv, '👑 Theo bảng Admin', cot, coQuyenCoVan, it));
      }
      return doc.save();
    }

    // Thường: thông tin chung + bảng CPSX + (Sale/Admin).
    doc.addPage(_trangThuong(r0, it, constants, profitTable));
    doc.addPage(_trangCpsx(r0, constants, materials, it));
    return doc.save();
  }

  static List<dynamic> _uniRows(CalculateResult r, AppConstants hangSo) {
    try {
      final lap = EngineAdvanced.instance.lapDongSanXuat(r, hangSo);
      return (lap['uniRows'] as List?) ?? const [];
    } catch (_) {
      return const [];
    }
  }

  // ── Trang thường ──────────────────────────────────────────────────────────
  static pw.Page _trangThuong(
    CalculateResult r,
    ChiTietExportInput it,
    AppConstants constants,
    List<ProfitRow> profitTable,
  ) {
    final input = it.input;
    final meta = getPricingDisplayMeta(input);
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    final chot = it.chotGia ?? 0;
    final hasChot = chot > 0;
    final deXuat = r.finalPrice;
    return pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          _header(meta.exportTitle, it.date),
          pw.SizedBox(height: 10),
          pw.Text('CHI TIẾT BẢNG TÍNH GIÁ',
              style:
                  pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          _thongTinChung(r, input, meta),
          pw.SizedBox(height: 12),
          _khoiGia(meta, deXuat, hasChot, chot, qty),
        ],
      ),
    );
  }

  static pw.Page _trangHeroNangCao(
    CalculateResult r,
    ChiTietExportInput it,
    AppConstants hangSo,
    List<ProfitRow> profitTable,
  ) {
    final input = it.input;
    final meta = getPricingDisplayMeta(input);
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    final chot = it.chotGia ?? 0;
    final hasChot = chot > 0;
    final deXuat = r.finalPrice;
    return pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          _header(meta.exportTitle, it.date),
          pw.SizedBox(height: 10),
          pw.Text('CHI TIẾT BẢNG TÍNH GIÁ  ·  NÂNG CẤP',
              style:
                  pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          _thongTinChung(r, input, meta),
          pw.SizedBox(height: 12),
          _khoiGia(meta, deXuat, hasChot, chot, qty),
        ],
      ),
    );
  }

  static pw.Page _trangCpsx(
    CalculateResult r,
    AppConstants constants,
    List<MaterialDef> materials,
    ChiTietExportInput it,
  ) {
    final lap = EngineAdvanced.instance.lapDongSanXuat(r, constants);
    final uniRows = (lap['uniRows'] as List?) ?? const [];
    final tongCPSX = (lap['totalCPSX'] as num?)?.toDouble() ?? 0;
    final tongCPVL = (lap['totalCPVL'] as num?)?.toDouble() ?? 0;
    final grand = (lap['grandTotal'] as num?)?.toDouble() ?? 0;
    final meta = getPricingDisplayMeta(it.input);
    return pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          _header(meta.exportTitle, it.date),
          pw.SizedBox(height: 10),
          pw.Text('BẢNG CPSX — CHI TIẾT CÔNG ĐOẠN SẢN XUẤT',
              style:
                  pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          pw.TableHelper.fromTextArray(
            cellStyle: const pw.TextStyle(fontSize: 8),
            headerStyle:
                pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            data: [
              ['Công đoạn', 'Vật liệu', 'Khổ (m)', 'TP (m)', 'PH (m)', 'ĐV (m)',
                  'CPSX', 'TT CPSX', 'CP VL', 'TT CPVL'],
              ...uniRows.map((row) {
                final m = (row as Map).cast<String, dynamic>();
                final meters = (m['meters'] as num?)?.toDouble() ?? 0;
                final waste = (m['waste'] as num?)?.toDouble() ?? 0;
                final details = (m['materialDetails'] as List?) ?? const [];
                final matLabel = details.isNotEmpty
                    ? details
                        .map((d) => ((d as Map)['name'] as String?) ?? '')
                        .join(' + ')
                    : ((m['mat'] as String?) ?? '');
                return [
                  (m['stage'] as String?) ?? '',
                  matLabel,
                  Fmt.d1((m['width'] as num?)?.toDouble() ?? 0),
                  Fmt.n(meters),
                  Fmt.n(waste),
                  Fmt.n(meters + waste),
                  Fmt.n((m['cpsx'] as num?)?.toDouble() ?? 0),
                  Fmt.n((m['costCPSX'] as num?)?.toDouble() ?? 0),
                  m['matPrice'] == null
                      ? '—'
                      : Fmt.d1((m['matPrice'] as num).toDouble()),
                  m['costMat'] == null
                      ? '—'
                      : Fmt.n((m['costMat'] as num).toDouble()),
                ];
              }),
              ['TỔNG', '', '', '', '', '', '', Fmt.n(tongCPSX), '', Fmt.n(tongCPVL)],
            ],
          ),
          pw.SizedBox(height: 10),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              'TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN: ${Fmt.n(grand)} đ',
              style:
                  pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ── Trang bảng đặc tả nâng cao (Bản gốc / Sale / Admin) ───────────────────
  static pw.Page _trangBangNangCao(
    CalculateResult r0,
    List<dynamic> uniRows,
    AppConstants hangSo,
    List<MaterialDef> materials,
    Map<String, Map<String, dynamic>> sourceOv,
    Map<String, Map<String, dynamic>> activeOv,
    String nhanNguon,
    ({bool coDien, bool coLuong, bool coThoiGian}) cot,
    bool coQuyenCoVan,
    ChiTietExportInput it,
  ) {
    final hasAnyOv = activeOv.isNotEmpty;
    List<dynamic> dongVL = const [];
    List<dynamic> dongNCD = const [];
    Map<String, dynamic> tong = const {};
    try {
      final dongXuLy = EngineAdvanced.instance.chuanBiUniRowsNangCao(
        uniRows: uniRows,
        result: r0,
        hangSo: hangSo,
        sourceOv: sourceOv,
        activeOv: hasAnyOv ? activeOv : const {},
      );
      dongVL = EngineAdvanced.instance.lapDongVatLieuNangCao(
        result: r0,
        uniRows: dongXuLy,
        hangSo: hangSo,
        materials: materials,
        overrides: hasAnyOv ? activeOv : null,
      );
      dongNCD = EngineAdvanced.instance.lapDongNhanCongDien(
        result: r0,
        hangSo: hangSo,
        overrides: hasAnyOv ? activeOv : null,
      );
      tong = EngineAdvanced.instance.tinhTongNangCao(dongVL, dongNCD);
    } catch (_) {
      // Để trang rỗng.
    }

    final tongVL = (tong['tongVatLieu'] as num?)?.toDouble() ?? 0;
    final tongNCD = (tong['tongNhanCongDien'] as num?)?.toDouble() ?? 0;
    final tongGiaThanh = (tong['tongGiaThanh'] as num?)?.toDouble() ?? 0;
    final hienBang2 = coQuyenCoVan && (cot.coLuong || cot.coDien);
    final meta = getPricingDisplayMeta(it.input);

    return pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(20),
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          _header(meta.exportTitle, it.date),
          pw.SizedBox(height: 8),
          pw.Text(
            'ĐẶC TẢ KỸ THUẬT & NGUYÊN LIỆU (NÂNG CAO) — $nhanNguon',
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 4),
          pw.TableHelper.fromTextArray(
            cellStyle: const pw.TextStyle(fontSize: 7),
            headerStyle:
                pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.centerLeft,
            },
            data: [
              ['C.đoạn', 'Vật liệu', 'Dày (mic)', 'Khổ (m)', 'TP (m)', 'PH (m)',
                  'ĐV NVL (m)', 'CP VL (đ/m²)', 'TT CPNVL', 'Giá mực, DM, keo, khác (đ/m²)', 'TT mực, DM, keo, khác'],
              ...dongVL.map((row) {
                final m = (row as Map).cast<String, dynamic>();
                final doDay = _doDayVL(m, materials);
                return [
                  (m['congDoan'] as String?) ?? '',
                  (m['vatLieu'] as String?) ?? '—',
                  doDay,
                  _metVL(m['khoMangLabel'], m['khoMang'], 3),
                  _metVL(m['thanhPhamLabel'], m['thanhPham'], 0),
                  m['phiHao'] == null ? '—' : Fmt.n((m['phiHao'] as num)),
                  _metVL(m['dauVaoNvlLabel'], m['dauVaoNVL'], 0),
                  m['cpVatLieu'] == null
                      ? '—'
                      : Fmt.d1((m['cpVatLieu'] as num)),
                  m['thanhTienNVL'] == null
                      ? '—'
                      : Fmt.n((m['thanhTienNVL'] as num)),
                  (m['cpMucKeoText'] as String?) ??
                      (m['cpMucKeo'] == null
                          ? '—'
                          : Fmt.d1((m['cpMucKeo'] as num))),
                  m['thanhTienMucKeo'] == null
                      ? '—'
                      : Fmt.n((m['thanhTienMucKeo'] as num)),
                ];
              }),
            ],
          ),
          if (hienBang2) ...[
            pw.SizedBox(height: 10),
            pw.Text('BẢNG 2 — NHÂN CÔNG & ĐIỆN',
                style: pw.TextStyle(
                    fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.TableHelper.fromTextArray(
              cellStyle: const pw.TextStyle(fontSize: 7),
              headerStyle:
                  pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold),
              headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey200),
              cellAlignments: {0: pw.Alignment.centerLeft},
              data: [
                [
                  'Công đoạn',
                  if (cot.coThoiGian) 'TG SX (phút)',
                  if (cot.coLuong) 'Giá NC (đ/phút)',
                  if (cot.coLuong) 'TT nhân công',
                  if (cot.coDien) 'Giá điện (đ/phút)',
                  if (cot.coDien) 'TT điện',
                ],
                ...dongNCD.map((row) {
                  final m = (row as Map).cast<String, dynamic>();
                  return <String>[
                    (m['congDoan'] as String?) ?? '',
                    if (cot.coThoiGian)
                      m['thoiGianPhut'] == null
                          ? '—'
                          : Fmt.n((m['thoiGianPhut'] as num)),
                    if (cot.coLuong)
                      m['cpNhanCongPerPhut'] == null
                          ? '—'
                          : Fmt.n((m['cpNhanCongPerPhut'] as num)),
                    if (cot.coLuong)
                      Fmt.n((m['thanhTienNhanCong'] as num?) ?? 0),
                    if (cot.coDien)
                      m['cpDienPerPhut'] == null
                          ? '—'
                          : Fmt.n((m['cpDienPerPhut'] as num)),
                    if (cot.coDien) Fmt.n((m['thanhTienDien'] as num?) ?? 0),
                  ];
                }),
                <String>[
                  'Tổng nhân công / điện',
                  if (cot.coThoiGian) '',
                  if (cot.coLuong) '',
                  if (cot.coLuong) Fmt.n(_tongNCD(dongNCD, 'thanhTienNhanCong')),
                  if (cot.coDien) '',
                  if (cot.coDien) Fmt.n(_tongNCD(dongNCD, 'thanhTienDien')),
                ],
              ],
            ),
          ],
          pw.SizedBox(height: 10),
          _totalLine('Tổng thành tiền CP Vật liệu', tongVL),
          _totalLine('Tổng thành tiền chi phí Nhân công + điện', tongNCD),
          _totalLine('TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN', tongGiaThanh, bold: true),
        ],
      ),
    );
  }

  static double _tongNCD(List<dynamic> rows, String key) {
    var s = 0.0;
    for (final e in rows) {
      s += (((e as Map)[key] as num?) ?? 0).toDouble();
    }
    return s;
  }

  static String _doDayVL(Map<String, dynamic> m, List<MaterialDef> materials) {
    final doDay = m['doDay'];
    if (doDay is num) return Fmt.n(doDay);
    final id = m['materialId'] as String?;
    if (id == null) return '—';
    for (final mat in materials) {
      if (mat.id == id) return Fmt.n(mat.thickness);
    }
    return '—';
  }

  static String _metVL(dynamic label, dynamic n, int soLe) {
    if (label is String && label.isNotEmpty) return label;
    if (n == null) return '—';
    return soLe > 0 ? Fmt.d3(n as num) : Fmt.n(n as num);
  }

  // ── Khối dùng chung ───────────────────────────────────────────────────────
  static pw.Widget _header(String exportTitle, String date) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
      child: pw.Row(children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('CÔNG TY CP LAI TRƯỜNG SƠN',
                  style: pw.TextStyle(
                      fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.Text(exportTitle, style: const pw.TextStyle(fontSize: 9)),
            ],
          ),
        ),
        pw.Text('Ngày: ${date.isEmpty ? _today() : date}',
            style: const pw.TextStyle(fontSize: 9)),
      ]),
    );
  }

  static pw.Widget _thongTinChung(
      CalculateResult r, Map<String, dynamic> input, PricingDisplayMeta meta) {
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    final spreadMm = ((input['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000;
    final cutMm = ((input['cutStep'] as num?)?.toDouble() ?? 0) * 1000;
    final soMau = (input['numColors'] as num?)?.toInt() ?? 0;
    return pw.TableHelper.fromTextArray(
      cellStyle: const pw.TextStyle(fontSize: 9),
      headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
      columnWidths: const {
        0: pw.FlexColumnWidth(1.2),
        1: pw.FlexColumnWidth(2),
      },
      data: [
        ['Khách hàng', input['customer']?.toString() ?? '—'],
        ['Sản phẩm', input['productName']?.toString() ?? '—'],
        ['Chất liệu', r.structureText],
        [meta.isFilm ? 'Diện tích' : 'Số lượng', '${Fmt.n(qty)} ${meta.unit}'],
        ['Số màu', soMau > 0 ? '$soMau màu' : 'Không in'],
        [
          'Kích thước',
          'KT ${spreadMm.toStringAsFixed(0)} mm x BC ${cutMm.toStringAsFixed(0)} mm'
        ],
        ['Độ dày', '${r.d('totalThickness').toStringAsFixed(1)} mic'],
        [
          meta.isFilm ? 'Diện tích băng' : 'Diện tích 1 túi',
          '${Fmt.d4(r.d('bagArea'))} m²'
        ],
      ],
    );
  }

  static pw.Widget _khoiGia(PricingDisplayMeta meta, double deXuat, bool hasChot,
      double chot, double qty) {
    final shown = hasChot ? chot : deXuat;
    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(width: 1),
        color: PdfColors.grey100,
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            hasChot
                ? 'Giá chốt / ${meta.unit}: ${Fmt.n(chot)} đ'
                : 'Giá đề xuất / ${meta.unit}: ${Fmt.n(deXuat)} đ',
            style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold),
          ),
          if (hasChot)
            pw.Text('(giá đề xuất ${Fmt.n(deXuat)} đ/${meta.unit})',
                style: const pw.TextStyle(fontSize: 9)),
          pw.SizedBox(height: 4),
          pw.Text('Doanh thu (theo giá ${hasChot ? 'chốt' : 'đề xuất'}): ${Fmt.n(shown * qty)} đ',
              style: const pw.TextStyle(fontSize: 9)),
          pw.Text('(chưa VAT)', style: const pw.TextStyle(fontSize: 8)),
        ],
      ),
    );
  }

  static pw.Widget _totalLine(String label, double value, {bool bold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label,
              style: pw.TextStyle(
                  fontSize: bold ? 10 : 9,
                  fontWeight:
                      bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
          pw.Text('${Fmt.n(value)} đ',
              style: pw.TextStyle(
                  fontSize: bold ? 10 : 9,
                  fontWeight:
                      bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
  }

  static String _today() {
    final d = DateTime.now();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  static Future<void> xemTruoc(Uint8List bytes, String name) =>
      Printing.layoutPdf(onLayout: (_) => bytes, name: name);

  static Future<void> chiaSe(Uint8List bytes, String name) =>
      Printing.sharePdf(bytes: bytes, filename: name);
}
