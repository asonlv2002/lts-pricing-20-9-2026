// src/app/api/production-orders/[id]/route.ts
// GET    — lấy chi tiết 1 lệnh
// PATCH  — cập nhật (status, manual, ...)
// DELETE — xóa

import { NextResponse } from 'next/server';
import { readProductionOrders, writeProductionOrders } from '@/lib/db';
import type { ProductionOrder } from '@/lib/types';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const orders = await readProductionOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ success: true, data: order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const patch = await request.json() as Partial<ProductionOrder>;
    const orders = await readProductionOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
    // Không cho phép sửa id, quoteId, snapshot
    const { id: _id, quoteId: _qid, snapshot: _snap, createdAt: _cat, ...allowed } = patch as any;
    const updated = { ...orders[idx], ...allowed };
    orders[idx] = updated;
    await writeProductionOrders(orders);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const orders = await readProductionOrders();
    const filtered = orders.filter(o => o.id !== id);
    if (filtered.length === orders.length) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
    }
    await writeProductionOrders(filtered);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
