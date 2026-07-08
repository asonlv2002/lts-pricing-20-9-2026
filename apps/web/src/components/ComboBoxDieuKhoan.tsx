"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export default function ComboBoxDieuKhoan({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCustomMode(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustom = customMode || (value !== '' && !options.includes(value));

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setCustomMode(false);
  };

  const handleCustomConfirm = () => {
    onChange(customValue);
    setOpen(false);
    setCustomMode(false);
  };

  return (
    <div className="wiz-cb" ref={containerRef}>
      <div
        className={`wiz-cb-trigger ${open ? 'wiz-cb-trigger--open' : ''}`}
        onClick={() => { setOpen(!open); setCustomMode(false); }}
      >
        <span className={`wiz-cb-value ${!value ? 'wiz-cb-placeholder' : ''}`}>
          {value || placeholder || 'Chọn...'}
        </span>
        <ChevronDown size={14} className={`wiz-cb-arrow ${open ? 'wiz-cb-arrow--open' : ''}`} />
      </div>
      {open && (
        <div className="wiz-cb-dropdown">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`wiz-cb-option ${value === opt ? 'wiz-cb-option--selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              <span>{opt}</span>
              {value === opt && <Check size={14} className="wiz-cb-check" />}
            </button>
          ))}
          <div className="wiz-cb-separator" />
          {customMode ? (
            <div className="wiz-cb-custom">
              <input
                className="wiz-cb-custom-input"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomConfirm();
                  if (e.key === 'Escape') { setCustomMode(false); setOpen(false); }
                }}
                placeholder="Nhập giá trị..."
                autoFocus
              />
              <button type="button" className="wiz-cb-custom-btn" onClick={handleCustomConfirm}>
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`wiz-cb-option wiz-cb-option--other ${isCustom ? 'wiz-cb-option--selected' : ''}`}
              onClick={() => { setCustomMode(true); setCustomValue(value); }}
            >
              <span>Khác...</span>
              {isCustom && <Check size={14} className="wiz-cb-check" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
