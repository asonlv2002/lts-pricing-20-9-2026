// src/app/api/config/profit-table/route.ts
import { NextResponse } from 'next/server';
import { writeProfitTable } from '@/lib/db';
import type { ProfitRow } from '@/lib/types';

// PUT /api/config/profit-table
// Body: { rows: ProfitRow[]; profitDefault?: { col1: number; col2: number } }
export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      rows: ProfitRow[];
      profitDefault?: { col1: number; col2: number };
    };

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Body phải có trường rows là mảng không rỗng' },
        { status: 400 }
      );
    }

    await writeProfitTable(body.rows, body.profitDefault);
    return NextResponse.json({ success: true, data: body });
  } catch (err: any) {
    console.error('[PUT /api/config/profit-table]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
