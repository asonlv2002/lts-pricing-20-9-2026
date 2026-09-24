// ═══════════════════════════════════════════════════════════════════════════
// timeline_nhat_ky — Timeline + DiffView (mirror ModuleNhatKy.tsx
// `TimelineEntry` + `DiffView` + `ACTION_CONFIG`).
//
// 2 chế độ diff:
//   - chiHienGiaTriMoi = true  → mỗi key 1 dòng "nhãn: giá trị mới"
//     (Nhật ký tính giá & báo giá, Nhật ký cấu hình)
//   - chiHienGiaTriMoi = false → khối đỏ "−" / xanh "+" (Nhật ký hệ thống)
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/audit_format.dart';
import 'package:lts_pricing/lib/audit_models.dart';
import 'package:lts_pricing/lib/nhat_ky_loc.dart';

import '../../theme/format.dart';
import '../../theme/lts_tokens.dart';

/// Icon + màu cho từng action (mirror `ACTION_CONFIG`).
class CauHinhAction {
  final IconData icon;
  final Color color;
  final Color bg;
  const CauHinhAction(this.icon, this.color, this.bg);
}

const Map<AuditAction, CauHinhAction> ACTION_CONFIG = {
  AuditAction.create:
      CauHinhAction(Icons.add_rounded, Color(0xFF059669), Color(0xFFD1FAE5)),
  AuditAction.update:
      CauHinhAction(Icons.edit_rounded, Color(0xFF2563EB), Color(0xFFDBEAFE)),
  AuditAction.delete: CauHinhAction(
      Icons.delete_outline_rounded, Color(0xFFDC2626), Color(0xFFFEE2E2)),
  AuditAction.lock: CauHinhAction(
      Icons.lock_outline_rounded, Color(0xFF374151), Color(0xFFF3F4F6)),
  AuditAction.unlock: CauHinhAction(
      Icons.lock_open_rounded, Color(0xFF7C3AED), Color(0xFFEDE9FE)),
  AuditAction.statusChange:
      CauHinhAction(Icons.check_rounded, Color(0xFF4F46E5), Color(0xFFE0E7FF)),
  AuditAction.overrideChange: CauHinhAction(
      Icons.edit_note_rounded, Color(0xFF0891B2), Color(0xFFCFFAFE)),
  AuditAction.assign: CauHinhAction(
      Icons.person_outline_rounded, Color(0xFF7C3AED), Color(0xFFEDE9FE)),
  AuditAction.versionRestore: CauHinhAction(
      Icons.restore_rounded, Color(0xFFD97706), Color(0xFFFEF3C7)),
  AuditAction.duplicate: CauHinhAction(
      Icons.description_outlined, Color(0xFF0D9488), Color(0xFFCCFBF1)),
  AuditAction.sendApproval:
      CauHinhAction(Icons.send_rounded, Color(0xFF4F46E5), Color(0xFFE0E7FF)),
  AuditAction.approve:
      CauHinhAction(Icons.check_rounded, Color(0xFF059669), Color(0xFFD1FAE5)),
  AuditAction.reject:
      CauHinhAction(Icons.close_rounded, Color(0xFFDC2626), Color(0xFFFEE2E2)),
  AuditAction.sendCustomer: CauHinhAction(
      Icons.mail_outline_rounded, Color(0xFF7C3AED), Color(0xFFEDE9FE)),
  AuditAction.createLsx: CauHinhAction(
      Icons.factory_outlined, Color(0xFF0D9488), Color(0xFFCCFBF1)),
  AuditAction.restore: CauHinhAction(
      Icons.restore_rounded, Color(0xFFD97706), Color(0xFFFEF3C7)),
};

const CauHinhAction _actionMacDinh =
    CauHinhAction(Icons.circle_outlined, Color(0xFF6B7280), Color(0xFFF3F4F6));

/// Log duyệt/từ chối BBG thương mại: chỉ cần dòng gọn "ai làm gì ở đâu".
bool laLogReviewBaoGia(AuditEntry entry) =>
    entry.targetType == TargetType.quote &&
    (entry.action == AuditAction.approve || entry.action == AuditAction.reject);

// ── DiffView ──────────────────────────────────────────────────────────────
class DiffView extends StatelessWidget {
  final Map<String, dynamic>? before;
  final Map<String, dynamic>? after;
  final Set<String>? hiddenKeys;
  final bool chiHienGiaTriMoi;
  const DiffView({
    super.key,
    this.before,
    this.after,
    this.hiddenKeys,
    this.chiHienGiaTriMoi = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    if (before == null && after == null) return const SizedBox.shrink();
    final keys = <String>{
      ...?before?.keys,
      ...?after?.keys,
    }.where((k) {
      if (HIDDEN_DIFF_KEYS.contains(k)) return false;
      if (hiddenKeys != null && hiddenKeys!.contains(k)) return false;
      return true;
    }).toList();
    if (keys.isEmpty) return const SizedBox.shrink();

    if (chiHienGiaTriMoi) {
      final dong = <Widget>[];
      for (final k in keys) {
        final oldVal = before?[k];
        final newVal = after?[k];
        if (oldVal == newVal) continue;
        final label = getAuditFieldLabel(k) ?? FIELD_LABELS[k] ?? k;
        final value = newVal != null ? _formatDiffValue(k, newVal) : '(trống)';
        dong.add(Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Text.rich(
            TextSpan(children: [
              TextSpan(
                text: '$label: ',
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: p.muted),
              ),
              TextSpan(
                text: value,
                style: TextStyle(fontSize: 12.5, color: p.text),
              ),
            ]),
          ),
        ));
      }
      if (dong.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: dong),
      );
    }

    final blocks = <Widget>[];
    for (final k in keys) {
      final oldVal = before?[k];
      final newVal = after?[k];
      if (oldVal == newVal) continue;
      blocks.add(Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(
                getAuditFieldLabel(k) ?? FIELD_LABELS[k] ?? k,
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: p.muted),
              ),
            ),
            if (oldVal != null)
              _khoiGiaTri('− ${_formatDiffValue(k, oldVal)}',
                  const Color(0xFFDC2626), const Color(0xFFFEE2E2)),
            if (newVal != null)
              _khoiGiaTri('+ ${_formatDiffValue(k, newVal)}',
                  const Color(0xFF059669), const Color(0xFFD1FAE5)),
          ],
        ),
      ));
    }
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: blocks),
    );
  }

  static Widget _khoiGiaTri(String text, Color fg, Color bg) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 2),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(text,
            style: TextStyle(fontSize: 12.5, color: fg, height: 1.4)),
      );
}

String _formatDiffValue(String fieldKey, dynamic val) {
  final formatted = formatAuditDisplayValue(fieldKey, val);
  return formatted == '—' ? '(trống)' : formatted;
}

// ── Timeline ──────────────────────────────────────────────────────────────
class TimelineNhatKy extends StatelessWidget {
  final List<({String dayKey, List<AuditEntry> items})> grouped;
  final bool chiHienGiaTriMoi;
  final void Function(AuditEntry entry) onOpen;
  const TimelineNhatKy({
    super.key,
    required this.grouped,
    required this.chiHienGiaTriMoi,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final nhom in grouped) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: _NhanNgay(dayKey: nhom.dayKey),
          ),
          for (final entry in nhom.items)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: TimelineEntry(
                entry: entry,
                chiHienGiaTriMoi: chiHienGiaTriMoi,
                onOpen: onOpen,
              ),
            ),
        ],
      ],
    );
  }
}

class _NhanNgay extends StatelessWidget {
  final String dayKey;
  const _NhanNgay({required this.dayKey});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: p.border)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            _nhanNgay(dayKey),
            style: TextStyle(
                fontSize: 12.5, fontWeight: FontWeight.w600, color: p.muted),
          ),
        ),
        Expanded(child: Container(height: 1, color: p.border)),
      ],
    );
  }
}

String _nhanNgay(String dayKey) {
  final dt = DateTime.tryParse(dayKey);
  if (dt == null) return dayKey;
  final now = DateTime.now();
  final homNay = DateTime(now.year, now.month, now.day);
  final ngay = DateTime(dt.year, dt.month, dt.day);
  final lech = homNay.difference(ngay).inDays;
  if (lech == 0) return 'Hôm nay';
  if (lech == 1) return 'Hôm qua';
  return Fmt.date(dayKey);
}

class TimelineEntry extends StatefulWidget {
  final AuditEntry entry;
  final bool chiHienGiaTriMoi;
  final void Function(AuditEntry entry) onOpen;
  const TimelineEntry({
    super.key,
    required this.entry,
    required this.chiHienGiaTriMoi,
    required this.onOpen,
  });

  @override
  State<TimelineEntry> createState() => _TimelineEntryState();
}

class _TimelineEntryState extends State<TimelineEntry> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final entry = widget.entry;
    final cfg = ACTION_CONFIG[entry.action] ?? _actionMacDinh;
    final laReviewBaoGia = laLogReviewBaoGia(entry);
    final hasDiff =
        (entry.before != null || entry.after != null || entry.note != null) &&
            !laReviewBaoGia;
    final managerDiff = entry.action == AuditAction.assign &&
            entry.targetType == TargetType.customer
        ? diffManagerLists(entry.before, entry.after)
        : null;
    final hasManagerChanges = managerDiff != null &&
        (managerDiff.added.isNotEmpty || managerDiff.removed.isNotEmpty);

    return Stack(
      children: [
        // Vạch dọc nối các mốc (đặt sau, không cần IntrinsicHeight).
        Positioned(
          left: 13,
          top: 30,
          bottom: 0,
          child: Container(width: 1.5, color: p.border),
        ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Timeline dot
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: cfg.bg,
                shape: BoxShape.circle,
                border: Border.all(color: cfg.color.withValues(alpha: 0.25)),
              ),
              child: Icon(cfg.icon, size: 14, color: cfg.color),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _dongMeta(p, entry, cfg),
                  const SizedBox(height: 6),
                  _the(p, entry, hasDiff, managerDiff, hasManagerChanges),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _dongMeta(LtsPalette p, AuditEntry entry, CauHinhAction cfg) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 4,
      children: [
        Text(
          _gio(entry.timestamp),
          style: TextStyle(
            fontSize: 12,
            color: p.muted,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        Text(
          entry.userName.isNotEmpty
              ? entry.userName
              : 'Người dùng không xác định',
          style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w600, color: p.text),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
          decoration: BoxDecoration(
            color: cfg.bg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            NHAN_ACTION_TIMELINE[entry.action] ??
                getAuditActionLabel(entry.action),
            style: TextStyle(
                fontSize: 11.5, fontWeight: FontWeight.w600, color: cfg.color),
          ),
        ),
      ],
    );
  }

  Widget _the(
    LtsPalette p,
    AuditEntry entry,
    bool hasDiff,
    ManagerDiff? managerDiff,
    bool hasManagerChanges,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _dongTarget(p, entry),
          if (entry.note != null && entry.note!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(entry.note!,
                  style: TextStyle(fontSize: 12.5, color: p.muted)),
            ),
          if (hasDiff && (entry.before != null || entry.after != null))
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => setState(() => _expanded = !_expanded),
                icon: Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  size: 16,
                  color: p.muted,
                ),
                label: Text(
                  _expanded ? 'Ẩn chi tiết' : 'Xem chi tiết thay đổi',
                  style: TextStyle(fontSize: 12, color: p.muted),
                ),
              ),
            ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: () => widget.onOpen(entry),
              icon: Icon(Icons.visibility_outlined, size: 16, color: p.accent),
              label: Text('Mở dữ liệu liên quan',
                  style: TextStyle(fontSize: 12, color: p.accent)),
            ),
          ),
          if (_expanded) ...[
            if (hasManagerChanges && managerDiff != null) ...[
              const SizedBox(height: 6),
              for (final name in managerDiff.added)
                _dongQuanLy(
                  '${entry.userName} đã thêm $name vào danh sách quản lí của ${entry.targetName ?? ''}',
                  const Color(0xFF059669),
                  const Color(0xFFD1FAE5),
                ),
              for (final name in managerDiff.removed)
                _dongQuanLy(
                  '${entry.userName} đã gỡ $name khỏi danh sách quản lí của ${entry.targetName ?? ''}',
                  const Color(0xFFDC2626),
                  const Color(0xFFFEE2E2),
                ),
            ],
            DiffView(
              before: entry.before,
              after: entry.after,
              hiddenKeys: hasManagerChanges ? MANAGER_DIFF_KEYS : null,
              chiHienGiaTriMoi: widget.chiHienGiaTriMoi,
            ),
          ],
        ],
      ),
    );
  }

  Widget _dongTarget(LtsPalette p, AuditEntry entry) {
    final label = NHAN_TARGET_TYPE[entry.targetType] ?? entry.targetType.name;
    if (entry.targetName != null && entry.targetName!.isNotEmpty) {
      return Text.rich(
        TextSpan(children: [
          TextSpan(
            text: '$label: ',
            style: TextStyle(fontSize: 13, color: p.muted),
          ),
          TextSpan(
            text: entry.targetName!,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w500, color: p.text),
          ),
        ]),
      );
    }
    return Text(label, style: TextStyle(fontSize: 13, color: p.muted));
  }

  static Widget _dongQuanLy(String text, Color fg, Color bg) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration:
            BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
        child:
            Text(text, style: TextStyle(fontSize: 13, color: fg, height: 1.5)),
      );
}

String _gio(String iso) {
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return iso;
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
  return '$h:$m';
}
