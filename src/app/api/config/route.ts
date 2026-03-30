// src/app/api/config/route.ts
// Trả về tất cả config trong một request duy nhất — dùng khi app khởi động
// để hydrate Zustand store mà không cần 3 fetch riêng lẻ.
import { NextResponse } from 'next/server';
import { readMaterials, readConstants, readProfitTable } from '@/lib/db';

export async function GET() {
  try {
    const [materials, constants, profitData] = await Promise.all([
      readMaterials(),
      readConstants(),
      readProfitTable(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        materials,
        constants,
        profitTable: profitData.rows,
        profitDefault: profitData.profitDefault,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/config]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
