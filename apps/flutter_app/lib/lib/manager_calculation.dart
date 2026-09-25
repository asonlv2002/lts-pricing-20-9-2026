// ═══════════════════════════════════════════════════════════════════════════
// ManagerCalculation — port `apps/web/src/lib/manager-calculation.ts` (lapDongSanXuat).
// Dựng bảng đặc tả kỹ thuật (uniRows: CPSX IN / GHÉP / CẮT) từ CalculateResult.
// Engine bundle trả key EN (printNLWidth, layers.print.material…) — mirror web.
// ═══════════════════════════════════════════════════════════════════════════
import '../engine/models.dart';

/// Khoá dòng ghi đè — mirror `OverrideRowKey` web (print | lam-N | cut).
typedef OverrideRowKey = String;

class MaterialDetail {
  final String? materialId;
  final String name;
  final double width;
  final double matPrice;
  final double costMat;
  const MaterialDetail({
    this.materialId,
    required this.name,
    required this.width,
    required this.matPrice,
    required this.costMat,
  });
}

/// Một dòng bảng đặc tả — mirror `UniRow` web.
class UniRow {
  final OverrideRowKey rowKey;
  final String stage;
  final String mat;
  final String? materialId;
  final double width;
  final double meters;
  final double waste;
  final double cpsx;
  final double costCPSX;
  final double? matPrice;
  final double? costMat;
  final double? outputWidth;
  final double printFilmCost;
  final double printFilmSetupHours;
  final double printFilmProductionHours;
  final double printFilmTotalHours;
  final double printFilmLaborCostPerHour;
  final List<MaterialDetail>? materialDetails;
  final bool isOutsourced;
  final bool matPriceIsPerM2;

  const UniRow({
    required this.rowKey,
    required this.stage,
    required this.mat,
    this.materialId,
    required this.width,
    required this.meters,
    required this.waste,
    required this.cpsx,
    required this.costCPSX,
    this.matPrice,
    this.costMat,
    this.outputWidth,
    this.printFilmCost = 0,
    this.printFilmSetupHours = 0,
    this.printFilmProductionHours = 0,
    this.printFilmTotalHours = 0,
    this.printFilmLaborCostPerHour = 0,
    this.materialDetails,
    this.isOutsourced = false,
    this.matPriceIsPerM2 = false,
  });
}

class KetQuaLapDong {
  final List<UniRow> uniRows;
  final double totalCPSX;
  final double totalCPVL;
  final double grandTotal;
  const KetQuaLapDong({
    required this.uniRows,
    required this.totalCPSX,
    required this.totalCPVL,
    required this.grandTotal,
  });
}

Map<String, dynamic>? _asMap(dynamic v) => v is Map ? v.cast<String, dynamic>() : null;
double _num(dynamic v) => (v as num?)?.toDouble() ?? 0;
List<dynamic> _asList(dynamic v) => v is List ? v : const [];

/// Mirror `lapDongSanXuat(result, constants)` — manager-calculation.ts:59.
/// [constants] optional: chỉ dùng cho `ghepCPSX` khi dòng GHÉP không gia công.
/// Nếu null → dùng `cpsx` engine đã tính (tương đương khi không GC).
KetQuaLapDong lapDongSanXuat(CalculateResult result, [AppConstants? constants]) {
  final raw = result.raw;
  final input = _asMap(raw['input']) ?? <String, dynamic>{};
  final layers = _asMap(raw['layers']) ?? <String, dynamic>{};
  final printLayer = _asMap(layers['print']);
  final laminations = _asList(layers['laminations']);

  final isMang = input['productType'] == 'mang';
  final isMangIn = isMang && input['filmType'] == 'mangIn';
  final outsource = _asMap(input['outsource']);
  final steps = input['pricingMode'] == 'outsource'
      ? _asList(outsource?['steps']).cast<dynamic>()
      : const [];
  final printGc = steps.contains('print');
  final printCfg = _asMap(outsource?['print']);
  final printVendor = printGc && printCfg?['filmSource'] == 'vendor';

  final uniRows = <UniRow>[];
  double totalCPSX = 0;
  double totalCPVL = 0;

  final printMat = _asMap(printLayer?['material']);
  totalCPSX += result.d('printCostCPSX');
  totalCPVL += result.d('printCostMaterial');
  final printMatPrice = printLayer?['matPrice'] != null
      ? _num(printLayer?['matPrice'])
      : _num(printMat?['pricePerM2']);
  uniRows.add(UniRow(
    rowKey: 'print',
    stage: 'CPSX IN',
    mat: (printMat?['name'] as String?) ?? '',
    materialId: printMat?['id'] as String?,
    width: result.d('printNLWidth'),
    meters: result.d('printMeters'),
    waste: result.d('printWaste'),
    cpsx: result.d('printCPSX'),
    costCPSX: result.d('printCostCPSX'),
    matPrice: printMatPrice,
    costMat: result.d('printCostMaterial'),
    outputWidth: result.d('printNLWidth'),
    printFilmCost: isMangIn ? result.d('printFilmCost') : 0,
    printFilmSetupHours: isMangIn ? result.d('printFilmSetupHours') : 0,
    printFilmProductionHours: isMangIn ? result.d('printFilmProductionHours') : 0,
    printFilmTotalHours: isMangIn ? result.d('printFilmTotalHours') : 0,
    printFilmLaborCostPerHour: isMangIn ? result.d('printFilmLaborCostPerHour') : 0,
    isOutsourced: printGc,
    matPriceIsPerM2: printVendor,
  ));

  // Sắp xếp lớp ghép theo layerNum tăng dần (mirror web .sort).
  final lamSorted = laminations.map(_asMap).whereType<Map<String, dynamic>>().toList()
    ..sort((a, b) => _num(a['layerNum']).compareTo(_num(b['layerNum'])));

  for (final lam in lamSorted) {
    final lamNum = _num(lam['layerNum']).toInt();
    totalCPSX += _num(lam['costCPSX']);
    totalCPVL += _num(lam['costMat']);
    final lamMat = _asMap(lam['material']);
    final layerCfg = _asMap(_asMap(outsource?['laminate'])?['layers'])?['layer$lamNum'];
    final layerCfgMap = _asMap(layerCfg);
    final lamGc = steps.contains('laminate');
    final lamVendor = lamGc && layerCfgMap?['filmSource'] == 'vendor';

    final chiTiet = _asList(lam['chiTietVatLieu']);
    final materialDetails = chiTiet.isEmpty
        ? null
        : chiTiet.map((item) {
            final it = _asMap(item) ?? <String, dynamic>{};
            return MaterialDetail(
              materialId: it['vatLieuId'] as String?,
              name: (it['ten'] as String?) ?? '',
              width: _num(it['kho']),
              matPrice: _num(it['donGia']),
              costMat: _num(it['chiPhiVL']),
            );
          }).toList();

    final hasDetails = materialDetails != null && materialDetails.isNotEmpty;
    final lamMatPrice = hasDetails
        ? null
        : (lam['matPrice'] != null ? _num(lam['matPrice']) : _num(lamMat?['pricePerM2']));
    final lamCpsx = lam['cpsx'] != null ? _num(lam['cpsx']) : _num(layerCfgMap?['gcPricePerM2']);
    final ghepCpsx = _num(constants?.raw['ghepCPSX']) != 0
        ? _num(constants?.raw['ghepCPSX'])
        : _num(lam['cpsx']);
    uniRows.add(UniRow(
      rowKey: 'lam-$lamNum',
      stage: 'GHÉP (Lớp $lamNum)',
      mat: hasDetails ? '' : ((lamMat?['name'] as String?) ?? ''),
      materialId: hasDetails ? null : lamMat?['id'] as String?,
      width: _num(lam['width']),
      meters: _num(lam['meters']),
      waste: _num(lam['waste']),
      cpsx: lamGc ? lamCpsx : ghepCpsx,
      costCPSX: _num(lam['costCPSX']),
      matPrice: lamMatPrice,
      costMat: _num(lam['costMat']),
      materialDetails: materialDetails,
      outputWidth: _num(lam['width']),
      isOutsourced: lamGc,
      matPriceIsPerM2: lamVendor,
    ));
  }

  if (!isMang) {
    totalCPSX += result.d('cutCostCPSX');
    final cutGc = steps.contains('slit') || steps.contains('bag');
    uniRows.add(UniRow(
      rowKey: 'cut',
      stage: 'CẮT',
      mat: '-',
      width: result.d('cutWidth'),
      meters: result.d('cutMeters'),
      waste: result.d('cutWaste'),
      cpsx: result.d('cutCPSX'),
      costCPSX: result.d('cutCostCPSX'),
      matPrice: null,
      costMat: null,
      outputWidth: _num(input['spreadWidth']) * ((_num(input['numImages'])) == 0 ? 1 : _num(input['numImages'])),
      isOutsourced: cutGc,
    ));
  }

  final printFilmCost = uniRows
      .map((row) => row.printFilmCost)
      .fold<double>(0, (m, c) => c > m ? c : m);
  return KetQuaLapDong(
    uniRows: uniRows,
    totalCPSX: totalCPSX,
    totalCPVL: totalCPVL,
    grandTotal: totalCPSX + totalCPVL + printFilmCost,
  );
}
