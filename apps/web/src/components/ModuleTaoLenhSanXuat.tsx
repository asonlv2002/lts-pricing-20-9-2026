"use client";
// src/components/ModuleTaoLenhSanXuat.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Module Tạo lệnh sản xuất - thin wrapper cho TaoLsxWizard (3 sections + header).
// Wizard chọn KH → chọn BG/sheet → nhập form → gọi POST /create-orders + PATCH
// inputValue. Sau khi tạo thành công → modal success → navigate lsx_list.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { TaoLsxWizard } from './wizard/TaoLsxWizard';

export interface ModuleTaoLenhSanXuatProps {
  khiDieuHuong?: (menuKey: string) => void;
}

export default function ModuleTaoLenhSanXuat({ khiDieuHuong }: ModuleTaoLenhSanXuatProps) {
  return (
    <TaoLsxWizard
      onSuccessNavigate={khiDieuHuong}
    />
  );
}
