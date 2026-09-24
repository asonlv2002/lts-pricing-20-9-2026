// ═══════════════════════════════════════════════════════════════════════════
// config_diff — So sánh 2 blob cấu hình (inputValue) của log price_config.
// ignore_for_file: constant_identifier_names
//
// Mirror NGUYÊN VĂN apps/web/src/lib/config-diff.ts:
//   - NHAN_CONFIG_NAME       : configName → tiếng Việt
//   - NHAN_TRUONG_CAU_HINH   : key trường → nhãn tiếng Việt (bảng nhãn)
//   - diffConfigBlobs()      : flatten 2 blob, chỉ trả leaf khác nhau
//
// LƯU Ý QUAN TRỌNG: web ép `Record<KhoaNhan, string>` để `tsc` fail khi thiếu
// key (bảo đảm phủ 100%). Dart KHÔNG có cơ chế tương đương → khi thêm field
// cấu hình mới trong web `types.ts`, PHẢI tự cập nhật NHAN_TRUONG_CAU_HINH ở
// đây. Thiếu key sẽ hiển thị key thô thay vì nhãn tiếng Việt.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:intl/intl.dart';

/// configName (BE) → nhãn tiếng Việt.
const Map<String, String> NHAN_CONFIG_NAME = {
  'MATERIALS': 'Vật liệu',
  'PRODUCTION': 'Chi phí sản xuất',
  'PRODUCTION_UPGRADE': 'Chi phí sản xuất (nâng cấp)',
  'PROFIT': 'Lợi nhuận',
  'SURCHARGES': 'Phụ phí',
  'INTEREST': 'Lãi vay',
  'WASTE': 'Hao hụt',
  'OUTSOURCE': 'Gia công ngoài',
};

/// Bảng nhãn trường — chép nguyên văn `config-diff.ts:91-268`.
const Map<String, String> NHAN_TRUONG_CAU_HINH = {
  // Key gốc của blob cấu hình
  'materials': 'Vật liệu',
  'smallWidthPrices': 'Giá khổ nhỏ',
  'profitTable': 'Bảng lợi nhuận',
  // Material / SmallWidthMaterialPrice
  'id': 'Mã',
  'name': 'Tên màng',
  'group': 'Nhóm vật liệu',
  'density': 'Tỉ trọng (g/cm³)',
  'thickness': 'Độ dày (mic)',
  'pricePerKg': 'Giá (₫/kg)',
  'isPETorPA': 'isPETorPA',
  'adjustableMic': 'Cho chỉnh mic',
  'rollLength': 'Chiều dài cuộn (m)',
  'inkPricePerColor': 'Giá mực mỗi màu (₫)',
  'pricePerM2': 'Giá (₫/m²)',
  'materialId': 'Mã vật liệu',
  'widthThresholdMm': 'Ngưỡng khổ (mm)',
  // ProfitRow
  'threshold': 'Ngưỡng (₫)',
  'col1': 'Cột 1 (%)',
  'col2': 'Cột 2 (%)',
  'largeCol1': 'Cột 1 khách lớn (%)',
  'largeCol2': 'Cột 2 khách lớn (%)',
  // Option / rule chung
  'key': 'Khóa',
  'label': 'Tên',
  'price': 'Giá (₫)',
  'weight': 'Trọng lượng (g)',
  'unit': 'Đơn vị',
  'multiplier': 'Hệ số',
  // PrintFilmProfitRate
  'customerGroup': 'Nhóm khách hàng',
  'colorFrom': 'Số màu từ',
  'colorTo': 'Số màu đến',
  'rate': 'Tỷ lệ',
  // ElectricTimeSlot
  'start': 'Giờ bắt đầu',
  'end': 'Giờ kết thúc',
  'hours': 'Thời lượng (giờ)',
  'pricePerKwh': 'Giá (₫/kWh)',
  // AppConstants — materials scope
  'zipperPrice': 'Giá Zipper (₫/m)',
  'zipperWeight': 'Trọng lượng Zipper (g/m)',
  // production
  'laborCost': 'Lao động CPSX (₫/m²)',
  'ghepCPSX': 'Ghép · CPSX (₫/m²)',
  'cutBase': 'Cắt · Giá cơ bản (₫/m)',
  'cutThreshold1': 'Cắt · Ngưỡng 1 (m)',
  'cutThreshold2': 'Cắt · Ngưỡng 2 (m)',
  'cutMult1': 'Cắt · Hệ số 1',
  'cutMult2': 'Cắt · Hệ số 2',
  'cutMult3': 'Cắt · Hệ số 3',
  'cutRules': 'Quy tắc cắt',
  'cylinderPricePerUnit': 'Đơn giá trục mặc định (₫)',
  'cylPriceA': 'Trục A (₫)',
  'cylPriceB': 'Trục B (₫)',
  'nhuPrice': 'Giá nhũ (₫/m²)',
  'moPrice': 'Giá phủ mờ (₫/m²)',
  'colorSetup': 'Giá in theo số màu',
  // surcharges
  'tapePrice': 'Giá băng keo (₫/m)',
  'tapeWeight': 'Trọng lượng băng keo (g/m)',
  'handlePrice': 'Giá quai mặc định (₫/cái)',
  'handleWeight': 'Trọng lượng quai (g)',
  'handleOptions': 'Loại quai',
  'boxPriceDefault': 'Giá thùng mặc định (₫/cái)',
  'bagsPerBoxDefault': 'Số túi/thùng mặc định',
  'boxOptions': 'Loại thùng',
  'shippingPerKmDefault': 'Vận chuyển (₫/km)',
  'shippingKmDefault': 'Vận chuyển · Km mặc định',
  // interest
  'interestBase': 'Lãi cơ bản (%/năm)',
  'interestSpread': 'Lãi thêm/tình huống (%/năm)',
  'paymentDays': 'Công nợ mặc định (ngày)',
  'customPaymentDays': 'Mốc công nợ thêm (ngày)',
  // waste
  'printWasteA': 'In · Hao hụt A',
  'printWasteB': 'In · Hao hụt B',
  'printWasteC': 'In · Hao hụt C',
  'printWasteD': 'In · Hao hụt D',
  'ghepWasteA': 'Ghép · Hao hụt A (m)',
  'ghepWasteB': 'Ghép · Hao hụt B (m/20m)',
  'ghepWasteC': 'Ghép · Hao hụt cố định (m)',
  'cutWasteA': 'Cắt · Hao hụt A (m)',
  'cutWasteB': 'Cắt · Hao hụt B (m/20m)',
  'cutWasteC': 'Cắt · Hao hụt cố định (m)',
  // mục in màng (printFilm*)
  'printFilmInkPriceBopp': 'Mục in màng · Mực BOPP (₫/m²)',
  'printFilmInkPriceOther': 'Mục in màng · Mực other (₫/m²)',
  'printFilmSetupMinutesPerColor': 'Mục in màng · Setup/màu (phút)',
  'printFilmSetupHourDivisor': 'Mục in màng · Chia giờ setup',
  'printFilmLengthThreshold': 'Mục in màng · Ngưỡng chạy chậm (m)',
  'printFilmShortRunSpeed': 'Mục in màng · Tốc độ chạy chậm (m/phút)',
  'printFilmLaborCostPerHour': 'Mục in màng · Lao động (₫/giờ)',
  'printFilmShippingThresholdM2': 'Mục in màng · Vận chuyển · Ngưỡng (m²)',
  'printFilmShippingBaseCost': 'Mục in màng · Vận chuyển · Cơ bản (₫)',
  'printFilmShippingLargeOrderM2': 'Mục in màng · Vận chuyển · Đơn lớn (m²)',
  'printFilmInterestRate': 'Mục in màng · Lãi vay (%)',
  'printFilmProfitRates': 'Lợi nhuận màng in',
  // danh sách tùy chọn
  'customCylTypes': 'Loại trục tùy chọn',
  'customAccessories': 'Phụ kiện tùy chọn',
  'customPrintSurcharges': 'Phụ phí in tùy chọn',
  // CPSX nâng cao — nhóm gốc
  'cpsxUpgradeElectric': 'Điện',
  'cpsxUpgradeLabor': 'Lương',
  'cpsxUpgradeInk': 'Mực',
  'cpsxUpgradeThoiGian': 'Thời gian SX',
  // Điện
  'slots': 'Khung giờ',
  'appliedSource': 'Nguồn giá',
  'appliedPricePerKwh': 'Giá áp dụng (₫/kWh)',
  'machines': 'Máy',
  'print': 'Máy in',
  'laminate': 'Máy ghép',
  'slit': 'Máy chia (tách)',
  'bag': 'Máy làm túi',
  'powerKw': 'Công suất (kW)',
  'efficiency': 'Hiệu suất',
  // Lương
  'wages': 'Bảng lương (₫/ca)',
  'mealMorning': 'Cơm sáng (₫/người)',
  'mealEvening': 'Cơm tối (₫/người)',
  'otFactor': 'Hệ số tăng ca',
  'shiftCount': 'Số ca',
  'peoplePerShift': 'SL người/ca',
  'machinesPerDay': 'Số máy/ngày',
  'hoursPerDay': 'Giờ máy/ngày',
  'otHours': 'Giờ tăng ca',
  'tyLeTangCa': 'Tỉ lệ CN tăng ca',
  'roundedPerMin': 'Giá làm tròn (₫/phút)',
  'mayTinh': 'Máy tính tham khảo',
  // Mực
  'opp': 'Mực OPP',
  'pet': 'Mực PET',
  'pe': 'Mực PE',
  'solventAdhesive': 'Dung môi & keo ghép',
  'dungMoi': 'Dung môi',
  'keo': 'Keo ghép',
  'rows': 'Danh sách dòng',
  'appliedPrice': 'Giá áp dụng (₫/kg)',
  'ma': 'Mã vật tư',
  'ten': 'Tên',
  'dvt': 'Đơn vị tính',
  'donGia': 'Đơn giá (₫)',
  'slDung': 'SL dùng',
  'ghiChu': 'Ghi chú',
  'congDoan': 'Công đoạn',
  'loaiMangKeys': 'Loại màng áp dụng',
  'dinhMucIn': 'Định mức in',
  'dinhMucGhep': 'Định mức ghép',
  'soMau': 'Số màu',
  'dmMucG': 'Định mức mực (g/m²)',
  'dmDungMoiG': 'Định mức dung môi (g/m²)',
  'keoKhoG': 'Keo khô (g/m²)',
  'dungMoiPhaKeoG': 'Dung môi pha keo (g/m²)',
  // Thời gian SX — máy in
  'mountMinutesPerColor': 'Lên trục (phút/màu)',
  'proofMinutes1to7': 'Duyệt mẫu 1-7 màu (phút)',
  'proofMinutes8': 'Duyệt mẫu 8 màu (phút)',
  'matteExtraMinutes': 'In phủ mờ thêm (phút)',
  'avgSpeedMPerMin': 'Tốc độ trung bình (m/phút)',
  // Thời gian SX — máy ghép
  'setupFirstMinutes': 'Setup lần đầu (phút)',
  'setupNextMinutes': 'Setup các lần sau (phút)',
  // Thời gian SX — máy chia
  'rules': 'Bảng rule',
  'setupMinutes': 'Setup (phút)',
  'speedMPerMin': 'Tốc độ (m/phút)',
  // Thời gian SX — máy làm túi
  'maxStepMm': 'Bước cắt tối đa (mm)',
  'stepOp': 'So sánh bước cắt',
  'minStepMm': 'Bước cắt tối thiểu (mm)',
  'setupRules': 'Bảng setup theo loại túi',
  'speedRules': 'Bảng tốc độ theo bước cắt',
};

// ── Format giá trị hiển thị (pre-format → chuỗi vi-VN) ────────────────────
const Set<String> KHOA_PHAN_TRAM = {
  'interestBase',
  'interestSpread',
  'printFilmInterestRate',
  'rate',
  'tyLeTangCa',
};

const Map<String, Map<String, String>> GIA_TRI_ENUM = {
  'customerGroup': {'normal': 'Bình thường', 'large': 'Khách lớn'},
  'appliedSource': {
    'average': 'Trung bình cộng',
    'weighted': 'Trung bình trọng số',
    'manual': 'Nhập tay',
  },
  'congDoan': {'in': 'In', 'ghep': 'Ghép'},
  'unit': {'per_piece': '₫/cái', 'per_meter': '₫/m'},
  'stepOp': {'lte': '≤', 'gte': '≥', 'lt': '<', 'gt': '>'},
};

final NumberFormat _nf6 = NumberFormat('#,##0.######', 'vi_VN');

String dinhDangSo(num n) => _nf6.format(n);

String dinhDangPhanTram(num n) {
  final phanTram = n * 100;
  final lamTron = (phanTram * 100).round() / 100;
  return '${dinhDangSo(lamTron)}%';
}

String dinhDangGiaTri(String key, dynamic value) {
  if (value == null) return '—';
  if (value is bool) return value ? 'Có' : 'Không';
  if (value is num) {
    if (KHOA_PHAN_TRAM.contains(key)) return dinhDangPhanTram(value);
    return dinhDangSo(value);
  }
  if (value is String) {
    final enumMap = GIA_TRI_ENUM[key];
    final mapped = enumMap?[value];
    if (mapped != null) return mapped;
    return value;
  }
  if (value is List) {
    return value.map((item) => dinhDangGiaTri(key, item)).join(', ');
  }
  return '(thông tin chi tiết)';
}

// ── Segment nhãn cho phần tử mảng ─────────────────────────────────────────
String? layTenHienThiItem(dynamic item) {
  if (item is! Map) return null;
  for (final k in const ['ten', 'label', 'name']) {
    final v = item[k];
    if (v is String && v.trim().isNotEmpty) return v.trim();
  }
  final cg = item['customerGroup'];
  if (cg is String && item['colorFrom'] != null) {
    final nhom = GIA_TRI_ENUM['customerGroup']?[cg] ?? cg;
    final tu = dinhDangSo((item['colorFrom'] as num));
    final den =
        item['colorTo'] != null ? dinhDangSo((item['colorTo'] as num)) : tu;
    return '$nhom · $tu-$den màu';
  }
  if (item['soMau'] != null)
    return 'Số màu ${dinhDangSo(item['soMau'] as num)}';
  return null;
}

const List<String> KHOA_DINH_DANH = ['id', 'ma', 'key'];

String? layKhoaDinhDanh(dynamic item) {
  if (item is! Map) return null;
  for (final k in KHOA_DINH_DANH) {
    final v = item[k];
    if (v is String && v.trim().isNotEmpty) return '$k:${v.trim()}';
  }
  final ten = layTenHienThiItem(item);
  if (ten != null) return 'ten:$ten';
  return null;
}

final RegExp _chiSo = RegExp(r'^\d+$');

String segmentChoKey(String key, String? chaKey) {
  if (chaKey == 'colorSetup' && _chiSo.hasMatch(key)) return 'Màu in $key';
  return NHAN_TRUONG_CAU_HINH[key] ?? key;
}

// ── Two-sided walk ────────────────────────────────────────────────────────
const int GIOI_HAN_PATH = 500;
const String DA_XOA = '(đã xóa)';

/// Key meta của blob gốc — đã thể hiện ở dòng chính của log, không đưa vào diff.
const Set<String> KHOA_META_GOC = {'name', 'effectiveFrom', 'effectiveMode'};

/// Sentinel phân biệt "key không tồn tại" (JS `undefined`) với `null` thật.
class KhongCo {
  const KhongCo();
}

const KhongCo khongCo = KhongCo();

bool laDoiTuong(dynamic v) => v is Map;

dynamic layKhoa(Map v, String k) => v.containsKey(k) ? v[k] : khongCo;

dynamic boKhoaMetaGoc(dynamic v) {
  if (v is! Map) return v;
  final ketQua = <String, dynamic>{};
  for (final e in v.entries) {
    if (!KHOA_META_GOC.contains(e.key)) ketQua[e.key] = e.value;
  }
  return ketQua;
}

class _BoDem {
  int count = 0;
}

class _MucTruoc {
  final dynamic item;
  final int index;
  const _MucTruoc(this.item, this.index);
}

void _diChuyen(
  dynamic truoc,
  dynamic sau,
  String path,
  String? chaKey,
  Map<String, dynamic> before,
  Map<String, dynamic> after,
  _BoDem dem,
) {
  if (dem.count >= GIOI_HAN_PATH) return;

  // Hai mảng → ghép phần tử
  if (truoc is List && sau is List) {
    final tatCaObject = truoc.every(laDoiTuong) && sau.every(laDoiTuong);
    if (tatCaObject && truoc.length + sau.length > 0) {
      final mapTruoc = <String, _MucTruoc>{};
      for (var i = 0; i < truoc.length; i++) {
        final item = truoc[i];
        mapTruoc[layKhoaDinhDanh(item) ?? 'idx:$i'] = _MucTruoc(item, i);
      }
      final daDung = <int>{};
      for (var i = 0; i < sau.length; i++) {
        final item = sau[i];
        final khoa = layKhoaDinhDanh(item) ?? 'idx:$i';
        final match = mapTruoc[khoa];
        if (match != null) daDung.add(match.index);
        final seg = layTenHienThiItem(item) ??
            segmentChoKey(khoa.split(':')[0], chaKey);
        _diChuyen(
          match?.item,
          item,
          path.isEmpty ? seg : '$path · $seg',
          null,
          before,
          after,
          dem,
        );
      }
      for (var i = 0; i < truoc.length; i++) {
        if (daDung.contains(i)) continue;
        final item = truoc[i];
        final seg = layTenHienThiItem(item) ?? '#${i + 1}';
        _diChuyen(
          item,
          null,
          path.isEmpty ? seg : '$path · $seg',
          null,
          before,
          after,
          dem,
        );
      }
      return;
    }
    // Mảng primitive → so sánh nguyên mảng thành 1 dòng
    final khoaKey = chaKey ?? '';
    final chuoiTruoc =
        truoc.isNotEmpty ? dinhDangGiaTri(khoaKey, truoc) : DA_XOA;
    final chuoiSau = sau.isNotEmpty ? dinhDangGiaTri(khoaKey, sau) : DA_XOA;
    if (chuoiTruoc != chuoiSau) {
      dem.count += 1;
      before[path] = chuoiTruoc;
      after[path] = chuoiSau;
    }
    return;
  }

  if (truoc is Map && sau is Map) {
    final keys = <String>{
      ...truoc.keys.map((e) => e.toString()),
      ...sau.keys.map((e) => e.toString()),
    };
    for (final k in keys) {
      // Key có ở blob cũ nhưng FE không còn gửi ở blob mới (nâng cấp schema,
      // tách scope...) — luôn là nhiễu, không phải thay đổi của user → bỏ.
      if (path.isEmpty &&
          layKhoa(truoc, k) != khongCo &&
          layKhoa(sau, k) == khongCo) {
        continue;
      }
      final seg = segmentChoKey(k, chaKey);
      _diChuyen(
        layKhoa(truoc, k),
        layKhoa(sau, k),
        path.isEmpty ? seg : '$path · $seg',
        k,
        before,
        after,
        dem,
      );
    }
    return;
  }

  // Leaf (hoặc 1 bên thiếu)
  final coTruoc = truoc != khongCo;
  final coSau = sau != khongCo;
  if (coTruoc == coSau && truoc == sau) return;

  final chuoiTruoc = coTruoc
      ? (laDoiTuong(truoc) || truoc is List
          ? '(thông tin chi tiết)'
          : dinhDangGiaTri(chaKey ?? '', truoc))
      : DA_XOA;
  final chuoiSau = coSau
      ? (laDoiTuong(sau) || sau is List
          ? '(thông tin chi tiết)'
          : dinhDangGiaTri(chaKey ?? '', sau))
      : DA_XOA;
  if (chuoiTruoc == chuoiSau) return;

  dem.count += 1;
  if (coTruoc) before[path] = chuoiTruoc;
  if (coSau) after[path] = chuoiSau;
  // Bị xóa: DiffView chế độ "giá trị mới" sẽ hiện "nhãn: (đã xóa)"
  if (coTruoc && !coSau) after[path] = DA_XOA;
}

/// So sánh 2 blob cấu hình (inputValue) — trả về CHỈ các leaf khác nhau /
/// thêm mới / bị xóa. Key = nhãn tiếng Việt đầy đủ; value = chuỗi vi-VN.
/// Side bị xóa = "(đã xóa)"; side thêm mới = không có key (DiffView hiện "+").
({Map<String, dynamic> before, Map<String, dynamic> after}) diffConfigBlobs(
  dynamic truoc,
  dynamic sau,
) {
  final before = <String, dynamic>{};
  final after = <String, dynamic>{};
  if (truoc == null && sau == null) return (before: before, after: after);
  final dem = _BoDem();
  _diChuyen(
    boKhoaMetaGoc(truoc ?? <String, dynamic>{}),
    boKhoaMetaGoc(sau ?? <String, dynamic>{}),
    '',
    null,
    before,
    after,
    dem,
  );
  return (before: before, after: after);
}
