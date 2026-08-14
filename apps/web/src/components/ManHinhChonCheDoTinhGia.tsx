'use client';

import React from 'react';
import type { PricingMode } from '../lib/types';

export function ManHinhChonCheDoTinhGia(props: {
  onChon: (mode: PricingMode) => void;
  nangCap?: boolean;
}) {
  const { onChon, nangCap } = props;

  return (
    <div className="card" style={{ padding: '28px 24px', maxWidth: 720, margin: '0 auto' }}>
      <div className="card-title" style={{ fontSize: '1.05rem', marginBottom: 6 }}>
        Tạo bảng tính giá{nangCap ? ' (nâng cấp)' : ''}
      </div>
      <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.88rem' }}>
        Bạn muốn làm gì? Chọn một hướng để bắt đầu — form nhập sẽ hiện sau khi chọn.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => onChon('internal')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            padding: '18px 16px',
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--surface)',
            cursor: 'pointer',
            minHeight: 120,
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: '1.5rem' }} aria-hidden>🏭</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Nội bộ</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            Tính giá LTS full — công thức hiện tại
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChon('outsource')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            padding: '18px 16px',
            textAlign: 'left',
            border: '1px solid rgba(220,38,38,0.35)',
            borderRadius: 12,
            background: 'rgba(220,38,38,0.04)',
            cursor: 'pointer',
            minHeight: 120,
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: '1.5rem' }} aria-hidden>🔧</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Gia công</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            Thuê ngoài 1+ công đoạn — chọn CD ngay trên form
          </span>
        </button>

        <button
          type="button"
          disabled
          title="Sắp có"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            padding: '18px 16px',
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--surface2, var(--surface))',
            cursor: 'not-allowed',
            opacity: 0.55,
            minHeight: 120,
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: '1.5rem' }} aria-hidden>📦</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Thương mại</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            Sắp có
          </span>
        </button>
      </div>
    </div>
  );
}
