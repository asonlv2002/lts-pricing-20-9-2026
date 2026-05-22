import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { AuditEntry, AuditAction } from '../../lib/types';
import { luuLocalStorage, LS_AUDIT } from '../helpers';

const MAX_AUDIT = 1000;

export interface AuditSlice {
  auditLog: AuditEntry[];

  ghiNhatKy: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  layNhatKyTheoMuc: (targetId: string) => AuditEntry[];
  xuatNhatKyCsv: (targetId?: string) => void;
  taiAuditLog: (data: AuditEntry[]) => void;
}

export const createAuditSlice: StateCreator<CuaHangTinhGia, [], [], AuditSlice> = (set, get) => ({
  auditLog: [],

  ghiNhatKy: (entry) => {
    set((state) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      const auditLog = [newEntry, ...state.auditLog].slice(0, MAX_AUDIT);
      luuLocalStorage(LS_AUDIT, auditLog);
      return { auditLog };
    });
  },

  layNhatKyTheoMuc: (targetId) => {
    return get().auditLog.filter(e => e.targetId === targetId);
  },

  xuatNhatKyCsv: (targetId) => {
    const entries = targetId
      ? get().auditLog.filter(e => e.targetId === targetId)
      : get().auditLog;

    const headers = ['Thời gian', 'Người thực hiện', 'Hành động', 'Loại', 'Mục tiêu', 'Ghi chú'];
    const ACTION_LABELS: Record<AuditAction, string> = {
      create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa',
      lock: 'Khóa', unlock: 'Mở khóa',
      status_change: 'Đổi trạng thái', override_change: 'Thay đổi override',
      assign: 'Phân công', version_restore: 'Khôi phục phiên bản', duplicate: 'Sao chép',
    };
    const rows = entries.map(e => [
      new Date(e.timestamp).toLocaleString('vi-VN'),
      e.userName,
      ACTION_LABELS[e.action] || e.action,
      e.targetType === 'history' ? 'Bảng tính' : 'Báo giá',
      e.targetName || e.targetId,
      e.note || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhat-ky-thao-tac-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  taiAuditLog: (data) => set({ auditLog: data }),
});
