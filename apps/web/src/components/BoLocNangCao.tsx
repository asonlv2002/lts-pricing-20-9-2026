"use client";
import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import type { QuoteStatus } from '../lib/types';
import { QUOTE_STATUS_CONFIG } from '../lib/types';

export interface FilterState {
  keyword: string;
  sellerId: string;
  tuNgay: string;
  denNgay: string;
  quoteCode: string;
  statuses: QuoteStatus[];
}

export const EMPTY_FILTER: FilterState = {
  keyword: '',
  sellerId: '',
  tuNgay: '',
  denNgay: '',
  quoteCode: '',
  statuses: [],
};

interface Props {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  sellers?: { id: string; name: string }[];
  showQuoteCode?: boolean;
  showStatus?: boolean;
  placeholder?: string;
}

export default function BoLocNangCao({ filter, onChange, sellers, showQuoteCode = true, showStatus = true, placeholder }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilter = filter.sellerId || filter.tuNgay || filter.denNgay || filter.quoteCode || filter.statuses.length > 0;

  const toggleStatus = (s: QuoteStatus) => {
    const statuses = filter.statuses.includes(s)
      ? filter.statuses.filter(x => x !== s)
      : [...filter.statuses, s];
    onChange({ ...filter, statuses });
  };

  return (
    <div className="boloc-root">
      <div className="boloc-main-row">
        <div className="crm-search-box" style={{ flex: 1 }}>
          <input
            className="crm-search-input"
            placeholder={placeholder || 'Tìm khách hàng, sản phẩm...'}
            value={filter.keyword}
            onChange={e => onChange({ ...filter, keyword: e.target.value })}
          />
          {filter.keyword && (
            <button className="crm-search-clear" onClick={() => onChange({ ...filter, keyword: '' })}>✕</button>
          )}
        </div>

        <button
          className={`btn btn-sm ${hasActiveFilter ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setExpanded(!expanded)}
          title="Lọc nâng cao"
        >
          <Filter size={14} />
          {hasActiveFilter && <span className="boloc-badge">{[filter.sellerId, filter.tuNgay, filter.denNgay, filter.quoteCode].filter(Boolean).length + filter.statuses.length}</span>}
        </button>

        {hasActiveFilter && (
          <button className="btn btn-sm btn-outline" onClick={() => onChange(EMPTY_FILTER)} title="Xóa bộ lọc">
            <X size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="boloc-panel">
          <div className="boloc-grid">
            {sellers && sellers.length > 0 && (
              <div className="form-group">
                <label className="form-label">Sale phụ trách</label>
                <select
                  className="form-input"
                  value={filter.sellerId}
                  onChange={e => onChange({ ...filter, sellerId: e.target.value })}
                >
                  <option value="">Tất cả</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {showQuoteCode && (
              <div className="form-group">
                <label className="form-label">Mã báo giá</label>
                <input
                  className="form-input"
                  value={filter.quoteCode}
                  onChange={e => onChange({ ...filter, quoteCode: e.target.value })}
                  placeholder="VD: BG-202605"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Từ ngày</label>
              <input
                className="form-input"
                type="date"
                value={filter.tuNgay}
                onChange={e => onChange({ ...filter, tuNgay: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Đến ngày</label>
              <input
                className="form-input"
                type="date"
                value={filter.denNgay}
                onChange={e => onChange({ ...filter, denNgay: e.target.value })}
              />
            </div>
          </div>

          {showStatus && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Trạng thái</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.keys(QUOTE_STATUS_CONFIG) as QuoteStatus[]).map(s => {
                  const cfg = QUOTE_STATUS_CONFIG[s];
                  const active = filter.statuses.includes(s);
                  return (
                    <button
                      key={s}
                      className="toolbar-btn"
                      style={{
                        background: active ? cfg.bg : undefined,
                        color: active ? cfg.color : undefined,
                        borderColor: active ? cfg.color + '55' : undefined,
                        fontWeight: active ? 600 : 400,
                      }}
                      onClick={() => toggleStatus(s)}
                    >
                      {cfg.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
