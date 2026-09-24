// ═══════════════════════════════════════════════════════════════════════════
// khach_hang_nhat_ky — Bản trình bày riêng cho "Nhật ký khách hàng"
// (mirror `CustomerAuditTab` trong ModuleKhachHang.tsx:1519-1599).
//
// Khác timeline: mỗi ngày 1 header dài (thứ, dd/MM/yyyy, số thao tác), card
// dùng summary 1 dòng + bảng Trường|Trước|Sau khi mở rộng.
// ignore_for_file: constant_identifier_names
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/audit_format.dart';
import 'package:lts_pricing/lib/audit_models.dart';

import '../../api/service_lts_client.dart';
import '../../store/app_state.dart';
import '../../theme/lts_tokens.dart';

const Map<AuditAction, Color> _ACTION_COLORS = {
  AuditAction.create: Color(0xFF22C55E),
  AuditAction.update: Color(0xFF0891B2),
  AuditAction.delete: Color(0xFFEF4444),
  AuditAction.lock: Color(0xFFF59E0B),
  AuditAction.unlock: Color(0xFF10B981),
  AuditAction.assign: Color(0xFF8B5CF6),
  AuditAction.statusChange: Color(0xFF4F46E5),
  AuditAction.approve: Color(0xFF22C55E),
  AuditAction.reject: Color(0xFFEF4444),
};

class KhachHangNhatKy extends StatelessWidget {
  final List<({String dayKey, List<AuditEntry> items})> grouped;
  final NguoiDungHienTai? currentUser;
  final List<TaiKhoanApi> users;
  final String? accessToken;
  const KhachHangNhatKy({
    super.key,
    required this.grouped,
    this.currentUser,
    this.users = const [],
    this.accessToken,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final ctx = AuditActorContext(
      currentUser: currentUser == null
          ? null
          : (
              id: currentUser!.id,
              fullName: currentUser!.fullName,
              account: currentUser!.account,
            ),
      users: users
          .map((u) => (
                id: u.id,
                name: u.fullName.isNotEmpty ? u.fullName : null,
                fullName: u.fullName.isNotEmpty ? u.fullName : null,
                account: u.account.isNotEmpty ? u.account : null,
              ))
          .toList(),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final nhom in grouped) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_nhanNgayDai(nhom.dayKey)} (${nhom.items.length} thao tác)',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: p.muted,
                      letterSpacing: 0.3),
                ),
                const SizedBox(height: 6),
                Container(height: 1, color: p.border),
              ],
            ),
          ),
          for (final entry in nhom.items)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: _TheKhachHang(
                entry: entry,
                ctx: ctx,
                accessToken: accessToken,
              ),
            ),
        ],
      ],
    );
  }
}

String _nhanNgayDai(String dayKey) {
  final dt = DateTime.tryParse(dayKey);
  if (dt == null) return dayKey;
  const thu = [
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
    'Chủ nhật',
  ];
  final t = thu[dt.weekday - 1];
  final d = dt.day.toString().padLeft(2, '0');
  final m = dt.month.toString().padLeft(2, '0');
  return '$t, $d tháng $m, ${dt.year}';
}

class _TheKhachHang extends StatefulWidget {
  final AuditEntry entry;
  final AuditActorContext ctx;
  final String? accessToken;
  const _TheKhachHang({
    required this.entry,
    required this.ctx,
    this.accessToken,
  });

  @override
  State<_TheKhachHang> createState() => _TheKhachHangState();
}

class _TheKhachHangState extends State<_TheKhachHang> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final e = widget.entry;
    final color = _ACTION_COLORS[e.action] ?? const Color(0xFF9CA3AF);
    final summary = getAuditSummary(e, widget.ctx);
    final changedFields = getAuditChangedFields(e);
    final avatarUrl = resolveServiceLtsUrl(summary.actorAvatarUrl);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 5),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        summary.actionLabel,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: color),
                      ),
                    ),
                    Text(
                      summary.targetName,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: p.text),
                    ),
                    Text(
                      _gio(e.timestamp),
                      style: TextStyle(fontSize: 12, color: p.muted),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    _AvatarNho(
                      url: avatarUrl,
                      accessToken: widget.accessToken,
                      fallbackColor: p.muted,
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text.rich(
                        TextSpan(children: [
                          TextSpan(
                            text: summary.actorName,
                            style: TextStyle(fontSize: 12, color: p.muted),
                          ),
                          if (e.note != null && e.note!.isNotEmpty)
                            TextSpan(
                              text: ' · ${e.note}',
                              style: TextStyle(fontSize: 12, color: p.muted),
                            ),
                        ]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                if (summary.description.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      summary.description,
                      style: TextStyle(fontSize: 12.5, color: p.text),
                    ),
                  ),
                if (summary.compactFields.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        for (final f in summary.compactFields)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: p.surface2,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(f,
                                style:
                                    TextStyle(fontSize: 11.5, color: p.muted)),
                          ),
                      ],
                    ),
                  ),
                if (changedFields.isNotEmpty)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () => setState(() => _expanded = !_expanded),
                      child: Text(
                        '${changedFields.length} thay đổi · ${_expanded ? 'Thu gọn' : 'Xem chi tiết'}',
                        style: TextStyle(fontSize: 12, color: p.accent),
                      ),
                    ),
                  ),
                if (_expanded && changedFields.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final f in changedFields)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(f.label,
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: p.muted)),
                                Text('Trước: ${f.before}',
                                    style: const TextStyle(
                                        fontSize: 12.5,
                                        color: Color(0xFFDC2626))),
                                Text('Sau: ${f.after}',
                                    style: const TextStyle(
                                        fontSize: 12.5,
                                        color: Color(0xFF059669))),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarNho extends StatelessWidget {
  final String? url;
  final String? accessToken;
  final Color fallbackColor;
  const _AvatarNho({
    this.url,
    this.accessToken,
    required this.fallbackColor,
  });

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return Icon(Icons.person_outline_rounded, size: 13, color: fallbackColor);
    }
    return ClipOval(
      child: Image.network(
        url!,
        width: 16,
        height: 16,
        fit: BoxFit.cover,
        headers: accessToken != null && accessToken!.isNotEmpty
            ? {'Authorization': 'Bearer $accessToken'}
            : null,
        errorBuilder: (_, __, ___) =>
            Icon(Icons.person_outline_rounded, size: 13, color: fallbackColor),
      ),
    );
  }
}

String _gio(String iso) {
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return iso;
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
  return '$h:$m';
}
