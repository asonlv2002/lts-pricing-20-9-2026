// src/app/api/history/[id]/route.ts
import { NextResponse } from 'next/server';
import { readHistory, writeHistory } from '@/lib/db';

// Lưu ý Next.js 15+/16: params là Promise, phải await
interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/history/:id — xóa một mục khỏi lịch sử
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const history = await readHistory();
    const before = history.length;
    const updated = history.filter(h => h.id !== id);

    if (updated.length === before) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy history item: ${id}` },
        { status: 404 }
      );
    }

    await writeHistory(updated);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    console.error('[DELETE /api/history/:id]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// PATCH /api/history/:id — cập nhật một số trường (chủ yếu: chotGia)
// Body: Partial<HistoryItem> — chỉ gửi các trường cần cập nhật
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const history = await readHistory();
    const idx = history.findIndex(h => h.id === id);

    if (idx === -1) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy history item: ${id}` },
        { status: 404 }
      );
    }

    // Không cho phép ghi đè id hoặc input (bảo vệ tính toàn vẹn dữ liệu)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, input: _input, ...safeUpdates } = body as any;
    history[idx] = { ...history[idx], ...safeUpdates };
    await writeHistory(history);

    return NextResponse.json({ success: true, data: history[idx] });
  } catch (err: any) {
    console.error('[PATCH /api/history/:id]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
