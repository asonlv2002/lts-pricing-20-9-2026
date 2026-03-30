// src/app/api/config/constants/route.ts
import { NextResponse } from 'next/server';
import { readConstants, writeConstants } from '@/lib/db';
import type { AppConstants } from '@/lib/types';

// PUT /api/config/constants
// Body: Partial<AppConstants> — merge vào constants hiện tại.
// Gửi toàn bộ AppConstants object cũng được (full replace).
export async function PUT(request: Request) {
  try {
    const body = await request.json() as Partial<AppConstants>;

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Body phải là AppConstants object' },
        { status: 400 }
      );
    }

    const current = await readConstants();
    const updated: AppConstants = {
      ...current,
      ...body,
      // colorSetup: deep-merge, ép string keys → number keys
      colorSetup: body.colorSetup
        ? (Object.fromEntries(
            Object.entries(body.colorSetup).map(([k, v]) => [Number(k), v])
          ) as Record<number, number>)
        : current.colorSetup,
    };

    await writeConstants(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[PUT /api/config/constants]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
