// ═══════════════════════════════════════════════════════════════════════════
// Material picker — dialog có search + group theo nhóm + chỉ số chi tiết
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../engine/models.dart';
import '../theme/format.dart';

class MaterialPickerField extends StatelessWidget {
  final String label;
  final String? value;
  final List<MaterialDef> materials;
  final ValueChanged<String?> onChanged;
  final IconData? icon;
  const MaterialPickerField({
    super.key,
    required this.label,
    required this.value,
    required this.materials,
    required this.onChanged,
    this.icon,
  });

  MaterialDef? get _selected {
    if (value == null) return null;
    for (final m in materials) {
      if (m.id == value) return m;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final selected = _selected;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 13, color: scheme.onSurfaceVariant),
                const SizedBox(width: 5),
              ],
              Text(label,
                  style: Theme.of(context)
                      .textTheme
                      .labelLarge
                      ?.copyWith(fontSize: 12.5)),
            ],
          ),
          const SizedBox(height: 6),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () async {
              final picked = await showModalBottomSheet<String?>(
                context: context,
                isScrollControlled: true,
                backgroundColor: Theme.of(context).colorScheme.surface,
                builder: (_) => _MaterialPickerSheet(
                  materials: materials,
                  current: value,
                ),
              );
              if (picked != '__cancel__') onChanged(picked);
            },
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: selected != null
                    ? scheme.primary.withValues(alpha: 0.06)
                    : scheme.surfaceContainerHighest.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected != null
                      ? scheme.primary.withValues(alpha: 0.3)
                      : scheme.outlineVariant.withValues(alpha: 0.5),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (selected != null
                              ? scheme.primary
                              : scheme.onSurfaceVariant)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      selected != null
                          ? Icons.layers
                          : Icons.layers_outlined,
                      size: 16,
                      color: selected != null
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                            selected == null
                                ? 'Chọn vật liệu'
                                : selected.name,
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: selected == null
                                    ? scheme.onSurfaceVariant
                                    : scheme.onSurface)),
                        if (selected != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                                '${selected.thickness}μ  ·  ${Fmt.n(selected.pricePerKg.round())} đ/kg',
                                style: Theme.of(context).textTheme.bodySmall),
                          ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right,
                      color: scheme.onSurfaceVariant, size: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MaterialPickerSheet extends StatefulWidget {
  final List<MaterialDef> materials;
  final String? current;
  const _MaterialPickerSheet(
      {required this.materials, required this.current});

  @override
  State<_MaterialPickerSheet> createState() => _MaterialPickerSheetState();
}

class _MaterialPickerSheetState extends State<_MaterialPickerSheet> {
  String _query = '';

  List<MaterialDef> get _filtered {
    if (_query.isEmpty) return widget.materials;
    final q = _query.toLowerCase();
    return widget.materials
        .where((m) =>
            m.name.toLowerCase().contains(q) ||
            m.id.toLowerCase().contains(q) ||
            (m.group ?? '').toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final grouped = <String, List<MaterialDef>>{};
    for (final m in _filtered) {
      grouped.putIfAbsent(m.group ?? 'Khác', () => []).add(m);
    }
    final groups = grouped.keys.toList();

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, controller) => Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: scheme.outlineVariant,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Icon(Icons.inventory_2, color: scheme.primary),
                const SizedBox(width: 10),
                Text('Chọn vật liệu',
                    style: Theme.of(context).textTheme.titleLarge),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => Navigator.pop<String?>(context, null),
                  icon: const Icon(Icons.clear, size: 16),
                  label: const Text('Bỏ chọn'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              autofocus: false,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm vật liệu…',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => setState(() => _query = ''),
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off,
                            size: 48, color: scheme.onSurfaceVariant),
                        const SizedBox(height: 8),
                        Text('Không tìm thấy vật liệu',
                            style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: controller,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    itemCount: groups.length,
                    itemBuilder: (ctx, gi) {
                      final group = groups[gi];
                      final items = grouped[group]!;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Padding(
                            padding:
                                const EdgeInsets.fromLTRB(4, 12, 4, 8),
                            child: Text(group.toUpperCase(),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelMedium
                                    ?.copyWith(letterSpacing: 1)),
                          ),
                          ...items.map((m) => _MaterialRow(
                                m: m,
                                selected: m.id == widget.current,
                                onTap: () => Navigator.pop(context, m.id),
                              )),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _MaterialRow extends StatelessWidget {
  final MaterialDef m;
  final bool selected;
  final VoidCallback onTap;
  const _MaterialRow(
      {required this.m, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: selected ? scheme.primary.withValues(alpha: 0.1) : null,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected
              ? scheme.primary
              : scheme.outlineVariant.withValues(alpha: 0.4),
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${m.thickness}μ',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: scheme.primary)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(m.name,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Wrap(
                      spacing: 10,
                      runSpacing: 2,
                      children: [
                        Text('ID: ${m.id}',
                            style:
                                Theme.of(context).textTheme.bodySmall),
                        Text('${Fmt.n(m.pricePerKg.round())} đ/kg',
                            style:
                                Theme.of(context).textTheme.bodySmall),
                        if (m.isPETorPA)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: scheme.tertiaryContainer,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('PET/PA',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color:
                                        scheme.onTertiaryContainer)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(Icons.check_circle, color: scheme.primary, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
