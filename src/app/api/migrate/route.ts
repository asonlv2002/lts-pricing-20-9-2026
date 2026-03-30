// src/app/api/migrate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// One-shot migration endpoint: nhận dữ liệu từ localStorage và ghi lên server.
// Chỉ chạy một lần trên mỗi browser session (được đánh dấu bằng lts_migration_v1).
//
// BẢO MẬT: xóa file này sau khi migration hoàn tất trên tất cả client.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { readMaterials, writeMaterials, readConstants, writeConstants,
         readProfitTable, writeProfitTable, writeHistory } from '@/lib/db';
import type { HistoryItem, Material, AppConstants, ProfitRow } from '@/lib/types';

interface MigratePayload {
  history?: HistoryItem[];
  materials?: Partial<Material>[];
  constants?: Partial<AppConstants>;
  profitTable?: Array<{ col1: number; col2: number }>;
}

export async function POST(request: Request) {
  try {
    // Guard đơn giản — thay bằng auth thực sự khi deploy production
    const authHeader = request.headers.get('x-migrate-key');
    if (authHeader !== process.env.MIGRATE_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as MigratePayload;
    const results: Record<string, string> = {};

    // ── History ──────────────────────────────────────────────────────────────
    if (Array.isArray(body.history) && body.history.length > 0) {
      await writeHistory(body.history);
      results.history = `${body.history.length} items ghi thành công`;
    }

    // ── Materials ─────────────────────────────────────────────────────────────
    if (Array.isArray(body.materials) && body.materials.length > 0) {
      const current = await readMaterials();
      const merged = current.map(m => {
        const patch = body.materials!.find(b => b.id === m.id);
        if (!patch) return m;
        const updated = { ...m, ...patch };
        updated.pricePerM2 = updated.pricePerKg * updated.thickness * updated.density / 1000;
        return updated;
      });
      await writeMaterials(merged);
      results.materials = `${merged.length} materials merged`;
    }

    // ── Constants ─────────────────────────────────────────────────────────────
    if (body.constants && typeof body.constants === 'object') {
      const current = await readConstants();
      const merged: AppConstants = {
        ...current,
        ...body.constants,
        colorSetup: body.constants.colorSetup
          ? (Object.fromEntries(
              Object.entries(body.constants.colorSetup).map(([k, v]) => [Number(k), v])
            ) as Record<number, number>)
          : current.colorSetup,
      };
      await writeConstants(merged);
      results.constants = 'merged';
    }

    // ── Profit Table ──────────────────────────────────────────────────────────
    if (Array.isArray(body.profitTable) && body.profitTable.length > 0) {
      const current = await readProfitTable();
      // Migrate chỉ có col1 và col2, giữ nguyên threshold từ server
      const mergedRows: ProfitRow[] = current.rows.map((row, idx) => ({
        ...row,
        col1: body.profitTable![idx]?.col1 ?? row.col1,
        col2: body.profitTable![idx]?.col2 ?? row.col2,
      }));
      await writeProfitTable(mergedRows, current.profitDefault);
      results.profitTable = `${mergedRows.length} rows merged`;
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[POST /api/migrate]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
