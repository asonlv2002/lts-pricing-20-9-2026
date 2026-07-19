'use client';

import React, { useState } from 'react';
import type { OutsourceStep, PricingMode } from '../lib/types';

const CD_OPTIONS: { key: OutsourceStep; label: string }[] = [
  { key: 'print', label: 'In' },
  { key: 'laminate', label: 'Ghép' },
  { key: 'slit', label: 'Chia' },
  { key: 'bag', label: 'Làm túi' },
  { key: 'handle', label: 'Gắn quai' },
  { key: 'pp_bag', label: 'Làm bao PP' },
];

export function ModalCheDoTinhGia(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: PricingMode, steps: OutsourceStep[]) => void;
}) {
  const { open, onClose, onConfirm } = props;
  const [mode, setMode] = useState<PricingMode | 'commercial'>('internal');
  const [steps, setSteps] = useState<OutsourceStep[]>([]);
  const [buoc, setBuoc] = useState<1 | 2>(1);

  if (!open) return null;

  const toggleStep = (key: OutsourceStep) => {
    setSteps(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key],
    );
  };

  const xuLyTiep = () => {
    if (mode === 'commercial') return;
    if (mode === 'internal') {
      onConfirm('internal', []);
      resetLocal();
      return;
    }
    if (buoc === 1) {
      setBuoc(2);
      return;
    }
    if (steps.length === 0) return;
    onConfirm('outsource', steps);
    resetLocal();
  };

  const resetLocal = () => {
    setMode('internal');
    setSteps([]);
    setBuoc(1);
  };

  const xuLyDong = () => {
    resetLocal();
    onClose();
  };

  const coTheTiep =
    mode === 'internal' ||
    (mode === 'outsource' && (buoc === 1 || steps.length > 0));

  return (
    <div className="lts-confirm-backdrop" onClick={xuLyDong}>
      <div
        className="lts-confirm-dialog"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, textAlign: 'left' }}
      >
        <h3 className="lts-confirm-title" style={{ marginBottom: 12 }}>
          Tạo bảng tính giá
        </h3>

        {buoc === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
              Chọn loại bảng tính
            </p>
            {(
              [
                { key: 'internal' as const, label: 'Nội bộ', desc: 'Tính giá LTS full (hiện tại)' },
                { key: 'outsource' as const, label: 'Gia công', desc: 'Thuê ngoài 1+ công đoạn' },
                { key: 'commercial' as const, label: 'Thương mại', desc: 'Sắp có' },
              ] as const
            ).map(opt => (
              <button
                key={opt.key}
                type="button"
                disabled={opt.key === 'commercial'}
                onClick={() => setMode(opt.key)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border:
                    mode === opt.key
                      ? '2px solid var(--accent, #4f46e5)'
                      : '1px solid var(--border)',
                  background:
                    mode === opt.key ? 'rgba(79,70,229,0.06)' : 'var(--surface)',
                  cursor: opt.key === 'commercial' ? 'not-allowed' : 'pointer',
                  opacity: opt.key === 'commercial' ? 0.55 : 1,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {buoc === 2 && mode === 'outsource' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 10px' }}>
              Chọn công đoạn gia công ngoài (≥1)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CD_OPTIONS.map(cd => (
                <label
                  key={cd.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={steps.includes(cd.key)}
                    onChange={() => toggleStep(cd.key)}
                  />
                  <span style={{ fontWeight: 600 }}>{cd.label}</span>
                </label>
              ))}
            </div>
            {steps.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 8 }}>
                Chọn ít nhất 1 công đoạn
              </p>
            )}
          </div>
        )}

        <div className="lts-confirm-actions" style={{ justifyContent: 'flex-end' }}>
          {buoc === 2 ? (
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setBuoc(1)}
            >
              ← Quay
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={xuLyDong}>
              Hủy
            </button>
          )}
          <button
            className="btn btn-primary"
            type="button"
            disabled={!coTheTiep}
            onClick={xuLyTiep}
          >
            {mode === 'outsource' && buoc === 1 ? 'Tiếp →' : 'Vào nhập liệu'}
          </button>
        </div>
      </div>
    </div>
  );
}
