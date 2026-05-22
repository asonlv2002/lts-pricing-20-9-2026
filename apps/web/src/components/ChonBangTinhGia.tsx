"use client";
import React, { useState, useMemo } from 'react';
import { Search, X, Check, Layers } from 'lucide-react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { HistoryItem, QuoteTier } from '../lib/types';

function dinhDangSo(n: number) { return n.toLocaleString('vi-VN'); }

interface Props {
  quoteId: string;
  currentTiers?: QuoteTier[];
  onClose: () => void;
}

export default function ChonBangTinhGia({ quoteId, currentTiers, onClose }: Props) {
  const { history, ganTiersBaoGia } = dungCuaHangTinhGia();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentTiers?.map(t => t.historyItemId) ?? [])
  );
  const [search, setSearch] = useState('');

  const available = useMemo(() => {
    return history.filter(h => {
      if (h.id === quoteId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return h.productName.toLowerCase().includes(q) ||
          h.customer.toLowerCase().includes(q) ||
          h.structure.toLowerCase().includes(q);
      }
      return true;
    });
  }, [history, quoteId, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const tiers: QuoteTier[] = Array.from(selected).map(id => {
      const item = history.find(h => h.id === id)!;
      return {
        historyItemId: id,
        quantity: item.quantity,
        finalPrice: item.finalPrice,
        chotGia: item.chotGia,
      };
    });
    ganTiersBaoGia(quoteId, tiers);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '80vh' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Layers size={18} /> Chọn bảng tính giá (mốc số lượng)
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="crm-search-box">
            <Search size={14} className="crm-search-icon" />
            <input
              className="crm-search-input"
              placeholder="Tìm sản phẩm, khách hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--muted)' }}>
            Đã chọn: <strong>{selected.size}</strong> bảng tính
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: 400, overflow: 'auto', padding: '8px 20px' }}>
          {available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              Không tìm thấy bảng tính phù hợp
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {available.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    className="boloc-tier-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-bg, rgba(59,130,246,0.08))' : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                    onClick={() => toggle(item.id)}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && <Check size={12} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {item.customer} · {item.structure} · SL: {dinhDangSo(item.quantity)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{dinhDangSo(Math.round(item.chotGia || item.finalPrice))} đ</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.quoteCode || item.date}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Lưu ({selected.size} mốc)
          </button>
        </div>
      </div>
    </div>
  );
}
