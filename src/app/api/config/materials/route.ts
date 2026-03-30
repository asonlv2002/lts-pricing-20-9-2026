// src/app/api/config/materials/route.ts
import { NextResponse } from 'next/server';
import { readMaterials, writeMaterials } from '@/lib/db';
import type { Material } from '@/lib/types';

// PUT /api/config/materials
// Body: Array<Partial<Material>> — merge các trường thay đổi vào dữ liệu hiện tại.
// Caller có thể gửi chỉ { id, thickness, pricePerKg, inkPricePerColor }
// mà không cần gửi toàn bộ Material object (density, rollLength, ... được giữ nguyên).
export async function PUT(request: Request) {
  try {
    const body = await request.json() as Partial<Material>[];

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Body phải là mảng Material không rỗng' },
        { status: 400 }
      );
    }

    const current = await readMaterials();
    const updated = current.map(m => {
      const patch = body.find(b => b.id === m.id);
      if (!patch) return m;
      const merged = { ...m, ...patch };
      // Tính lại pricePerM2 khi thickness hoặc pricePerKg thay đổi
      merged.pricePerM2 = merged.pricePerKg * merged.thickness * merged.density / 1000;
      return merged;
    });

    await writeMaterials(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[PUT /api/config/materials]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
