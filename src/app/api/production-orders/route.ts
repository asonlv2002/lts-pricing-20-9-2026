// src/app/api/production-orders/route.ts
// GET  — danh sách tất cả lệnh sản xuất
// POST — tạo lệnh sản xuất mới

import { NextResponse } from 'next/server';
import { readProductionOrders, writeProductionOrders } from '@/lib/db';
import type { ProductionOrder } from '@/lib/types';

export async function GET() {
  try {
    const orders = await readProductionOrders();
    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ProductionOrder;
    if (!body.id || !body.quoteId) {
      return NextResponse.json({ success: false, error: 'Thiếu id hoặc quoteId' }, { status: 400 });
    }
    const orders = await readProductionOrders();
    // Idempotent: nếu id đã tồn tại → trả về 200
    const existing = orders.find(o => o.id === body.id);
    if (existing) {
      return NextResponse.json({ success: true, data: existing }, { status: 200 });
    }
    const updated = [body, ...orders];
    await writeProductionOrders(updated);
    return NextResponse.json({ success: true, data: body }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
