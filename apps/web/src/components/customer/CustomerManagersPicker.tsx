'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search, UserPlus, X } from 'lucide-react';
import { layTaiKhoanService, type TaiKhoanApi } from '../../lib/api/service-lts';
import { locTaiKhoanActive, type CustomerManagerUi } from '../../lib/customer-api';
import { normalizeDisplayText } from '../../lib/text-codec';

interface CustomerManagersPickerProps {
  token?: string;
  value: CustomerManagerUi[];
  disabled?: boolean;
  onChange: (next: CustomerManagerUi[]) => void;
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function accountName(account: TaiKhoanApi | CustomerManagerUi) {
  return normalizeDisplayText(account.fullName || account.account || ('userId' in account ? account.userId : account.id));
}

export function CustomerManagersPicker({ token, value, disabled = false, onChange }: CustomerManagersPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [accounts, setAccounts] = useState<TaiKhoanApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || disabled) return;
    const query = keyword.trim();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      layTaiKhoanService(token, query || undefined)
        .then(data => setAccounts(locTaiKhoanActive(Array.isArray(data) ? data : []).slice(0, 8)))
        .catch(err => setError(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản.'))
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [disabled, keyword, token]);

  const selectedIds = useMemo(() => new Set(value.map(manager => manager.userId)), [value]);
  const suggestions = accounts.filter(account => !selectedIds.has(account.id));

  const addManager = (account: TaiKhoanApi) => {
    if (disabled || selectedIds.has(account.id)) return;
    onChange([
      ...value,
      {
        userId: account.id,
        account: account.account,
        fullName: normalizeDisplayText(account.fullName || account.account),
      },
    ]);
  };

  const removeManager = (userId: string) => {
    if (disabled) return;
    onChange(value.filter(manager => manager.userId !== userId));
  };

  return (
    <div className="crm2-managers-picker">
      {!disabled && (
        <div className="crm2-field">
          <label className="crm2-field-label"><Search size={12}/><span>Tìm tài khoản active</span></label>
          <input
            className="crm2-input"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="Tìm tài khoản active theo tên hoặc username..."
          />
          {loading && <span className="crm2-field-hint">Đang tải tài khoản...</span>}
          {error && <span className="crm2-field-error" role="alert"><AlertCircle size={11}/>{error}</span>}
        </div>
      )}

      {!disabled && suggestions.length > 0 && (
        <div className="crm2-manager-suggestions">
          <div className="crm2-manager-section-title">Gợi ý tài khoản active</div>
          {suggestions.map(account => {
            const name = accountName(account);
            return (
              <button type="button" className="crm2-manager-suggestion" key={account.id} onClick={() => addManager(account)}>
                <span className="crm2-manager-avatar">{initials(name)}</span>
                <span className="crm2-manager-main"><b>{name}</b><small>@{account.account}</small></span>
                <span className="crm2-manager-add"><UserPlus size={13}/> Thêm</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="crm2-manager-selected-head">
        <span>Người đang phụ trách</span>
        <b>{value.length} người</b>
      </div>

      {value.length === 0 ? (
        <div className="crm2-manager-empty">
          <UserPlus size={22}/>
          <b>Chưa có người phụ trách</b>
          <span>{disabled ? 'Khách hàng này chưa được phân công.' : 'Tìm tài khoản active phía trên để thêm vào khách hàng.'}</span>
        </div>
      ) : (
        <div className="crm2-manager-list">
          {value.map(manager => {
            const name = accountName(manager);
            return (
              <div className="crm2-manager-row" key={manager.userId}>
                <span className="crm2-manager-avatar">{initials(name)}</span>
                <span className="crm2-manager-main"><b>{name}</b>{manager.account && <small>@{manager.account}</small>}</span>
                <span className="crm2-manager-badge">Người phụ trách</span>
                {!disabled && <button type="button" className="crm2-btn-icon" aria-label="Xóa người phụ trách" onClick={() => removeManager(manager.userId)}><X size={14}/></button>}
              </div>
            );
          })}
        </div>
      )}

      {!disabled && value.length === 0 && (
        <div className="crm2-alert crm2-alert--warning"><AlertCircle size={14}/> Cần ít nhất 1 người phụ trách trước khi lưu.</div>
      )}
    </div>
  );
}
