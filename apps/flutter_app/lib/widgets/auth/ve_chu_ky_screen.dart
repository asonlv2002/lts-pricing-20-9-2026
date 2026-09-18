// ═══════════════════════════════════════════════════════════════════════════
// VeChuKyScreen — mirror DoiChuKyModal.tsx (chế độ vẽ tay): canvas vẽ ngón,
// Xóa để vẽ lại, Lưu → PNG bytes → POST /auth/signatures.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show RenderRepaintBoundary;
import 'package:provider/provider.dart';

import '../../store/app_state.dart';
import '../../theme/lts_tokens.dart';

class VeChuKyScreen extends StatefulWidget {
  const VeChuKyScreen({super.key});

  @override
  State<VeChuKyScreen> createState() => _VeChuKyScreenState();
}

class _VeChuKyScreenState extends State<VeChuKyScreen> {
  final _boundaryKey = GlobalKey();
  final List<List<Offset>?> _strokes = [];
  bool _dangXuLy = false;
  String? _loi;

  void _onPanStart(DragStartDetails d) {
    setState(() => _strokes.add([d.localPosition]));
  }

  void _onPanUpdate(DragUpdateDetails d) {
    if (_strokes.isEmpty) return;
    setState(() => _strokes.last!.add(d.localPosition));
  }

  void _onPanEnd(DragEndDetails d) {
    // điểm cuối null = ngắt nét
    setState(() => _strokes.add(null));
  }

  Future<void> _luu() async {
    if (_strokes.where((s) => s != null).isEmpty) {
      setState(() => _loi = 'Chưa có chữ ký — hãy vẽ vào khung bên trên.');
      return;
    }
    setState(() {
      _loi = null;
      _dangXuLy = true;
    });
    try {
      final boundary = _boundaryKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) return;
      final image =
          await boundary.toImage(pixelRatio: 3.0);
      final byteData =
          await image.toByteData(format: ui.ImageByteFormat.png);
      final bytes = byteData!.buffer.asUint8List();
      if (!mounted) return;
      await context
          .read<AppState>()
          .taiChuKyMoi(bytes, 'signature-${DateTime.now().millisecondsSinceEpoch}.png');
      if (mounted) Navigator.of(context).pop();
    } catch (err) {
      setState(() => _loi = err is Exception ? 'Lưu chữ ký thất bại.' : '$err');
    } finally {
      if (mounted) setState(() => _dangXuLy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Scaffold(
      backgroundColor: p.shellBg,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: const Text('Đổi chữ ký',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Vẽ chữ ký của bạn vào khung bên dưới.',
                  style: TextStyle(fontSize: 13, color: p.muted)),
              const SizedBox(height: 12),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: p.border),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: RepaintBoundary(
                      key: _boundaryKey,
                      child: GestureDetector(
                        onPanStart: _onPanStart,
                        onPanUpdate: _onPanUpdate,
                        onPanEnd: _onPanEnd,
                        child: CustomPaint(
                          painter: _ChuKyPainter(strokes: _strokes),
                          child: const SizedBox.expand(),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (_loi != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(_loi!,
                      style: const TextStyle(
                          fontSize: 13, color: Color(0xFFB42318))),
                ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: p.muted,
                        side: BorderSide(color: p.border),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _dangXuLy
                          ? null
                          : () => setState(() {
                                _strokes.clear();
                                _loi = null;
                              }),
                      child: const Text('Xóa'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF5B4DFF),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _dangXuLy ? null : _luu,
                      child: _dangXuLy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Lưu chữ ký',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChuKyPainter extends CustomPainter {
  final List<List<Offset>?> strokes;
  _ChuKyPainter({required this.strokes});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF111827)
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final stroke in strokes) {
      if (stroke == null || stroke.isEmpty) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final o in stroke.skip(1)) {
        path.lineTo(o.dx, o.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ChuKyPainter old) => true;
}
