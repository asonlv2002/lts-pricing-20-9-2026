"use client";
import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, padding: '24px 28px',
          maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
          {title}
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border, #e5e7eb)',
              background: 'var(--surface, #f3f4f6)', color: 'var(--foreground, #111)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: 'var(--accent, #0891b2)', color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
