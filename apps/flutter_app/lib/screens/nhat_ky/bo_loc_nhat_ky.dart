// ═══════════════════════════════════════════════════════════════════════════
// bo_loc_nhat_ky — Panel "Thêm bộ lọc" + chip "Đang lọc" (mirror phần advanced
// filters + activeChips của ModuleNhatKy.tsx).
//
// Dùng checkbox/label thuần (không overlay) để tránh lỗi layout/overflow đặc
// thù Flutter khi bàn phím mở: gợi ý tài khoản hiện inline trong khung cuộn
// có chiều cao giới hạn.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/audit_models.dart';
import 'package:lts_pricing/lib/nhat_ky_loc.dart';

import '../../theme/lts_tokens.dart';

class BoLocNhatKy extends StatefulWidget {
  final Set<AuditAction> filterActions;
  final Set<TargetType> filterModule;
  final Set<String> filterField;
  final String filterUser;
  final String targetSearch;
  final List<({String id, String name})> allUsers;
  final bool hienThiUser;
  final bool hienThiField;
  final bool hienThiModule;

  final ValueChanged<Set<AuditAction>> onActions;
  final ValueChanged<Set<TargetType>> onModule;
  final ValueChanged<Set<String>> onField;
  final ValueChanged<String> onUser;
  final ValueChanged<String> onTargetSearch;

  const BoLocNhatKy({
    super.key,
    required this.filterActions,
    required this.filterModule,
    required this.filterField,
    required this.filterUser,
    required this.targetSearch,
    required this.allUsers,
    this.hienThiUser = false,
    this.hienThiField = false,
    this.hienThiModule = true,
    required this.onActions,
    required this.onModule,
    required this.onField,
    required this.onUser,
    required this.onTargetSearch,
  });

  @override
  State<BoLocNhatKy> createState() => _BoLocNhatKyState();
}

class _BoLocNhatKyState extends State<BoLocNhatKy> {
  final TextEditingController _userCtrl = TextEditingController();
  final TextEditingController _targetCtrl = TextEditingController();
  bool _hienGoiY = false;

  @override
  void initState() {
    super.initState();
    _targetCtrl.text = widget.targetSearch;
    if (widget.filterUser.isNotEmpty) {
      for (final u in widget.allUsers) {
        if (u.id == widget.filterUser) {
          _userCtrl.text = u.name;
          break;
        }
      }
    }
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _targetCtrl.dispose();
    super.dispose();
  }

  // Đồng bộ khi cha reset bộ lọc (nút "Xóa tất cả" / chip) — State không bị
  // tạo lại nên controller phải tự cập nhật, tránh text cũ còn sót.
  @override
  void didUpdateWidget(BoLocNhatKy oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.targetSearch != oldWidget.targetSearch &&
        _targetCtrl.text != widget.targetSearch) {
      _targetCtrl.text = widget.targetSearch;
    }
    if (widget.filterUser.isEmpty && oldWidget.filterUser.isNotEmpty) {
      _userCtrl.clear();
      _hienGoiY = false;
    }
  }

  List<({String id, String name})> get _goiY {
    final q = _userCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return widget.allUsers;
    return widget.allUsers
        .where((u) =>
            u.name.toLowerCase().contains(q) || u.id.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface2,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(LtsT.rInput),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.hienThiUser) ...[
            _nhanNhom('Tài khoản thực hiện'),
            const SizedBox(height: 4),
            TextField(
              controller: _userCtrl,
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Gõ tên hoặc mã nhân viên...',
                suffixIcon: widget.filterUser.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded, size: 16),
                        onPressed: () {
                          _userCtrl.clear();
                          widget.onUser('');
                          setState(() => _hienGoiY = false);
                        },
                      ),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(LtsT.rInput)),
              ),
              onChanged: (_) => setState(() => _hienGoiY = true),
              onTap: () => setState(() => _hienGoiY = true),
            ),
            if (_hienGoiY && _goiY.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 4),
                constraints: const BoxConstraints(maxHeight: 160),
                decoration: BoxDecoration(
                  color: p.surface,
                  border: Border.all(color: p.border),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: ListView(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  children: [
                    for (final u in _goiY)
                      InkWell(
                        onTap: () {
                          _userCtrl.text = u.name;
                          widget.onUser(u.id);
                          setState(() => _hienGoiY = false);
                          FocusScope.of(context).unfocus();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 8),
                          color: widget.filterUser == u.id
                              ? p.accent.withValues(alpha: 0.08)
                              : null,
                          child: Text(u.name,
                              style: TextStyle(fontSize: 13, color: p.text)),
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
          ],
          if (widget.hienThiModule) ...[
            _nhanNhom('Phân mục dữ liệu'),
            const SizedBox(height: 4),
            for (final e in NHAN_TARGET_TYPE.entries)
              _dongCheck(
                label: e.value,
                checked: widget.filterModule.contains(e.key),
                onChanged: (_) => widget.onModule(_doiModule(e.key)),
              ),
            const SizedBox(height: 12),
          ],
          _nhanNhom('Loại hành động'),
          const SizedBox(height: 4),
          Text('1. Thay đổi dữ liệu:',
              style: TextStyle(
                  fontSize: 11.5, fontStyle: FontStyle.italic, color: p.muted)),
          for (final a in DATA_CHANGE_ACTIONS)
            _dongCheck(
              label: NHAN_ACTION_TIMELINE[a] ?? getAuditActionLabelFallback(a),
              checked: widget.filterActions.contains(a),
              onChanged: (_) => widget.onActions(_doiAction(a)),
            ),
          const SizedBox(height: 4),
          Text('2. Thay đổi trạng thái:',
              style: TextStyle(
                  fontSize: 11.5, fontStyle: FontStyle.italic, color: p.muted)),
          for (final a in STATUS_CHANGE_ACTIONS)
            _dongCheck(
              label: NHAN_ACTION_TIMELINE[a] ?? getAuditActionLabelFallback(a),
              checked: widget.filterActions.contains(a),
              onChanged: (_) => widget.onActions(_doiAction(a)),
            ),
          if (widget.hienThiField) ...[
            const SizedBox(height: 12),
            _nhanNhom('Trường thay đổi'),
            const SizedBox(height: 4),
            for (final f in CUSTOMER_DATA_FIELDS)
              _dongCheck(
                label: f.label,
                checked: widget.filterField.contains(f.value),
                onChanged: (_) => widget.onField(_doiField(f.value)),
              ),
          ],
          const SizedBox(height: 12),
          _nhanNhom('Đối tượng mục tiêu'),
          const SizedBox(height: 4),
          TextField(
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Tên khách hàng, mô tả báo giá...',
              helperText: 'Tìm theo tên hoặc mô tả dữ liệu',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(LtsT.rInput)),
            ),
            controller: _targetCtrl,
            onChanged: widget.onTargetSearch,
          ),
        ],
      ),
    );
  }

  Widget _nhanNhom(String text) {
    final p = LtsT.of(context);
    return Text(text,
        style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: p.muted));
  }

  Widget _dongCheck({
    required String label,
    required bool checked,
    required ValueChanged<bool?> onChanged,
  }) {
    final p = LtsT.of(context);
    return InkWell(
      onTap: () => onChanged(!checked),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            Checkbox(
              value: checked,
              onChanged: onChanged,
              visualDensity: VisualDensity.compact,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            const SizedBox(width: 6),
            Expanded(
              child:
                  Text(label, style: TextStyle(fontSize: 12.5, color: p.text)),
            ),
          ],
        ),
      ),
    );
  }

  Set<AuditAction> _doiAction(AuditAction a) {
    final next = Set<AuditAction>.of(widget.filterActions);
    if (!next.remove(a)) next.add(a);
    return next;
  }

  Set<TargetType> _doiModule(TargetType m) {
    final next = Set<TargetType>.of(widget.filterModule);
    if (!next.remove(m)) next.add(m);
    return next;
  }

  Set<String> _doiField(String f) {
    final next = Set<String>.of(widget.filterField);
    if (!next.remove(f)) next.add(f);
    return next;
  }
}

String getAuditActionLabelFallback(AuditAction a) => a.name;

/// Chip "Đang lọc: …" + "Xóa tất cả" (mirror `activeChips`).
class ChipDangLoc extends StatelessWidget {
  final List<({String label, VoidCallback clear})> chips;
  final VoidCallback onClearAll;
  const ChipDangLoc({
    super.key,
    required this.chips,
    required this.onClearAll,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    if (chips.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text('Đang lọc:', style: TextStyle(fontSize: 12, color: p.muted)),
          for (final c in chips)
            Container(
              padding: const EdgeInsets.only(left: 8, right: 4),
              decoration: BoxDecoration(
                color: p.accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(c.label,
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: p.accent)),
                  InkWell(
                    onTap: c.clear,
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.all(3),
                      child:
                          Icon(Icons.close_rounded, size: 13, color: p.accent),
                    ),
                  ),
                ],
              ),
            ),
          InkWell(
            onTap: onClearAll,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cancel_outlined, size: 13, color: p.muted),
                  const SizedBox(width: 3),
                  Text('Xóa tất cả',
                      style: TextStyle(fontSize: 12, color: p.muted)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
