// src/app/api/history/route.ts
import { NextResponse } from 'next/server';
import { readHistory, writeHistory } from '@/lib/db';
import type { HistoryItem } from '@/lib/types';

// GET /api/history — trả về toàn bộ danh sách lịch sử
export async function GET() {
  try {
    const history = await readHistory();
    return NextResponse.json({ success: true, data: history });
  } catch (err: any) {
    console.error('[GET /api/history]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// POST /api/history — thêm một mục mới vào đầu danh sách
// Body: HistoryItem (đầy đủ object bao gồm id, date, input, ...)
export async function POST(request: Request) {
  try {
    const body = await request.json() as HistoryItem;

    if (!body.id || !body.date || !body.input) {
      return NextResponse.json(
        { success: false, error: 'Thiếu các trường bắt buộc: id, date, input' },
        { status: 400 }
      );
    }

    const history = await readHistory();

    // Idempotent: nếu id đã tồn tại thì bỏ qua (an toàn khi retry)
    if (history.some(h => h.id === body.id)) {
      return NextResponse.json({ success: true, data: body });
    }

    const updated = [body, ...history].slice(0, 200); // giới hạn 200 mục
    await writeHistory(updated);

    return NextResponse.json({ success: true, data: body }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/history]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
