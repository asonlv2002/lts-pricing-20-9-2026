'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface NhapMaPinProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SO_O = 6;

/** Nhập mã PIN kiểu 6 ô riêng biệt — mỗi ô 1 chữ số, tự nhảy ô kế tiếp. */
export default function NhapMaPin({ value, onChange, disabled, autoFocus }: NhapMaPinProps) {
  const [kyTu, setKyTu] = useState<string[]>(() => Array(SO_O).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (value === '' && kyTu.some((ky) => ky !== '')) {
      setKyTu(Array(SO_O).fill(''));
    }
  }, [value, kyTu]);

  const capNhat = useCallback(
    (next: string[]) => {
      setKyTu(next);
      onChange(next.join(''));
    },
    [onChange],
  );

  const xuLyThayDoi = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const chuSo = e.target.value.replace(/\D/g, '');
      const next = [...kyTu];
      if (!chuSo) {
        next[index] = '';
        capNhat(next);
        return;
      }
      next[index] = chuSo[chuSo.length - 1];
      capNhat(next);
      if (index < SO_O - 1) refs.current[index + 1]?.focus();
    },
    [kyTu, capNhat],
  );

  const xuLyPhim = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !kyTu[index] && index > 0) {
        const next = [...kyTu];
        next[index - 1] = '';
        capNhat(next);
        refs.current[index - 1]?.focus();
      }
    },
    [kyTu, capNhat],
  );

  const xuLyDan = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const chuoi = e.clipboardData.getData('text').replace(/\D/g, '');
      if (!chuoi) return;
      const next = [...kyTu];
      for (let i = 0; i < chuoi.length && index + i < SO_O; i++) {
        next[index + i] = chuoi[i];
      }
      capNhat(next);
      const cuoi = Math.min(index + chuoi.length - 1, SO_O - 1);
      refs.current[cuoi]?.focus();
      refs.current[cuoi]?.select();
    },
    [kyTu, capNhat],
  );

  const xuLyFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  return (
    <div className="pin-6-o">
      {kyTu.map((ky, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className="pin-6-o-input"
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={ky}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          onChange={(e) => xuLyThayDoi(index, e)}
          onKeyDown={(e) => xuLyPhim(index, e)}
          onPaste={(e) => xuLyDan(index, e)}
          onFocus={xuLyFocus}
          aria-label={`Chữ số thứ ${index + 1} của mã PIN`}
        />
      ))}
    </div>
  );
}
