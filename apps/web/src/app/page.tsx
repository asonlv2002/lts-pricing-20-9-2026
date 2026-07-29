"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { Material, ProfitRow, BoxOption, ConfigSnapshot } from '../lib/types';
import TheNhapLieu from '../components/TheNhapLieu';
import ManHinhQuanLy from '../components/ManHinhQuanLy';
import ManHinhKyThuat from '../components/ManHinhKyThuat';
import { ManHinhChonCheDoTinhGia } from '../components/ManHinhChonCheDoTinhGia';
import type { PricingMode } from '../lib/types';
import { ArrowLeft, FileText } from 'lucide-react';
import { dieuHuongMenuApp } from '../lib/menu-route';

// ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Format helper ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
function dinhDangSo(n: number, soLe = 0): string {
  if (!n || isNaN(n)) return '├â┬ó├óΓÇÜ┬¼├óΓé¼┬¥';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: soLe, maximumFractionDigits: soLe });
}

// ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Thanh gi├â╞Æ├é┬í mini (mobile) ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
function ThanhGiaMini({ onNhan }: { onNhan: () => void }) {
  const { result, currentChotGia } = dungCuaHangTinhGia();
  if (!result) return null;

  const gia = currentChotGia > 0 ? currentChotGia : result.finalPrice;
  const laMang = result.input.productType === 'mang';
  const donVi = laMang ? 'm├âΓÇÜ├é┬▓' : 't├â╞Æ├é┬║i';

  return (
    <div className="mini-price-strip" onClick={onNhan} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onNhan()}
      title="Nh├â┬í├é┬║├é┬Ñn ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├åΓÇÖ xem k├â┬í├é┬║├é┬┐t qu├â┬í├é┬║├é┬ú chi ti├â┬í├é┬║├é┬┐t"
    >
      <div className="mps-left">
        <span className="mps-label">Gi├â╞Æ├é┬í {currentChotGia > 0 ? 'ch├â┬í├é┬╗├óΓé¼╦£t' : '├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├é┬ü xu├â┬í├é┬║├é┬Ñt'}</span>
        <span className="mps-price">{dinhDangSo(gia, 0)} ├âΓÇ₧├óΓé¼╦£/{donVi}</span>
      </div>
      <div className="mps-right">
        <span className="mps-profit">LN: {dinhDangSo(result.profitRate * 100, 1)}%</span>
        <span className="mps-arrow">├â┬ó├óΓé¼┬á├óΓé¼Γäó Xem chi ti├â┬í├é┬║├é┬┐t</span>
      </div>
    </div>
  );
}

// ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Thanh k├â╞Æ├é┬⌐o ├âΓÇ₧├óΓé¼╦£i├â┬í├é┬╗├é┬üu ch├â┬í├é┬╗├óΓé¼┬░nh panel (desktop) ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
function ThanhKeoPanel({ onKeo }: { onKeo: (delta: number) => void }) {
  const dangKeo = useRef(false);
  const xBatDau = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dangKeo.current = true;
    xBatDau.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dangKeo.current) return;
      const delta = e.clientX - xBatDau.current;
      xBatDau.current = e.clientX;
      onKeo(delta);
    };
    const onMouseUp = () => {
      dangKeo.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onKeo]);

  return (
    <div
      className="panel-resizer"
      onMouseDown={onMouseDown}
      title="K├â╞Æ├é┬⌐o ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├åΓÇÖ ├âΓÇ₧├óΓé¼╦£i├â┬í├é┬╗├é┬üu ch├â┬í├é┬╗├óΓé¼┬░nh ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓÇ₧┬ó r├â┬í├é┬╗├óΓÇ₧┬óng panel nh├â┬í├é┬║├é┬¡p li├â┬í├é┬╗├óΓé¼┬íu"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="panel-resizer-handle" />
    </div>
  );
}

// ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Trang ch├â╞Æ├é┬¡nh ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
export default function TrangChinh() {
  const {
    activeView: gocNhinHienTai, layoutType: kieuBoTriCuc, density: matDoHienThi, theme: chuDe, advancedOpen: moRongNangCao,
    materials: danhSachVatLieu, constants: hangSo, profitTable: bangLoiNhuan, smallWidthPrices: bangGiaKhoNho, result: ketQua,
    setActiveView: datGocNhin,
    isAuthenticated: daDangNhap,
    pricingEntry,
    setPricingEntry: datPricingEntry,
    resetInput: datLaiDauVao,
    setInput: capNhatDauVao,
  } = dungCuaHangTinhGia();

  const [tabMobile, datTabMobile] = useState<'input' | 'result'>('input');
  const [doRongTrai, datDoRongTrai] = useState<number | null>(null);
  const [laMobile, datLaMobile] = useState(false);
  const [anPanelNhap, datAnPanelNhap] = useState(false);
  const coTheAnPanelNhap = !laMobile && kieuBoTriCuc !== 'stacked' && kieuBoTriCuc !== 'bento';

  const dangChonCheDo = pricingEntry === 'pick';

  const xuLyChonCheDoTinhGia = (mode: PricingMode) => {
    datLaiDauVao();
    // resetInput sets pricingEntry back to pick ├â┬ó├óΓÇÜ┬¼├óΓé¼┬¥ force form after mode choice
    capNhatDauVao({
      pricingMode: mode,
      outsource: mode === 'outsource' ? { steps: [] } : undefined,
    });
    datPricingEntry('form');
  };


  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Ph├â╞Æ├é┬ít hi├â┬í├é┬╗├óΓé¼┬ín mobile ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  useEffect(() => {
    const check = () => datLaMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ T├â┬í├é┬╗├é┬▒ chuy├â┬í├é┬╗├åΓÇÖn sang k├â┬í├é┬║├é┬┐t qu├â┬í├é┬║├é┬ú khi c├â╞Æ├é┬│ t├â╞Æ├é┬¡nh to├â╞Æ├é┬ín m├â┬í├é┬╗├óΓé¼┬║i ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  const ketQuaTruoc = useRef<typeof ketQua>(null);
  useEffect(() => {
    if (ketQua && ketQua !== ketQuaTruoc.current) {
      ketQuaTruoc.current = ketQua;
      if (laMobile) setTimeout(() => datTabMobile('result'), 350);
      if (gocNhinHienTai !== 'manager' && gocNhinHienTai !== 'config') datGocNhin('manager');
    }
    if (!ketQua && laMobile) {
      ketQuaTruoc.current = null;
      datTabMobile('input');
    }
  }, [ketQua, laMobile, gocNhinHienTai, datGocNhin]);

  const xuLyKeoPanel = useCallback((delta: number) => {
    datDoRongTrai(prev => {
      const hienTai = prev ?? 380;
      return Math.max(200, Math.min(600, hienTai + delta));
    });
  }, []);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ ├âΓÇ₧├é┬É├â┬í├é┬╗├óΓé¼┼ông b├â┬í├é┬╗├óΓÇ₧┬ó theme / layout / density ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', chuDe);
    document.documentElement.setAttribute('data-layout', kieuBoTriCuc);
    document.documentElement.setAttribute('data-density', matDoHienThi);
    if (gocNhinHienTai === 'config') document.documentElement.classList.add('in-config-page');
    else document.documentElement.classList.remove('in-config-page');
  }, [chuDe, kieuBoTriCuc, matDoHienThi, gocNhinHienTai]);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Kh├â┬í├é┬╗├à┬╕i t├â┬í├é┬║├é┬ío t├â┬í├é┬╗├é┬½ localStorage ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  useEffect(() => {
    try {
      // UI preferences
      const uiRaw = window.localStorage.getItem('lts_ui_prefs');
      if (uiRaw) {
        const ui = JSON.parse(uiRaw) as {
          kieuBoTriCuc?: 'default' | 'stacked' | 'wide' | 'bento';
          matDoHienThi?: 'compact' | 'comfortable' | 'spacious';
          chuDe?: 'light' | 'dark';
          moRongNangCao?: boolean;
        };
        dungCuaHangTinhGia.setState(s => ({
          ...s,
          layoutType: ui.kieuBoTriCuc ?? s.layoutType,
          density: ui.matDoHienThi ?? s.density,
          theme: ui.chuDe ?? s.theme,
          advancedOpen: typeof ui.moRongNangCao === 'boolean' ? ui.moRongNangCao : s.advancedOpen,
        }));
      }

      // LSX ├â┬ó├óΓÇÜ┬¼├óΓé¼┬¥ kh├â╞Æ├é┬┤ng l├âΓÇá├é┬░u local; d├â┬í├é┬╗├é┬ìn key c├âΓÇª├é┬⌐ n├â┬í├é┬║├é┬┐u c├â╞Æ├é┬▓n
      try { window.localStorage.removeItem('lts_production_orders'); } catch {}
      dungCuaHangTinhGia.setState({ productionOrders: [] });


      // Audit log
      // D├â┬í├é┬╗├é┬ìn r├â╞Æ├é┬íc localStorage nh├â┬í├é┬║├é┬¡t k├â╞Æ├é┬╜ c├âΓÇª├é┬⌐ (├âΓÇ₧├óΓé¼╦£├â╞Æ├é┬ú chuy├â┬í├é┬╗├åΓÇÖn sang server-only)
      try { window.localStorage.removeItem('lts_audit_log'); } catch {}

      // Versions
      const rawVersions = window.localStorage.getItem('lts_versions');
      if (rawVersions) {
        try {
          const parsed = JSON.parse(rawVersions);
          if (Array.isArray(parsed)) dungCuaHangTinhGia.setState({ versions: parsed });
        } catch {}
      }

      // Phi├â╞Æ├é┬¬n b├â┬í├é┬║├é┬ún b├â┬í├é┬║├é┬úng ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓé¼┬╣nh m├â┬í├é┬╗├é┬⌐c
      const rawConfigSnapshots = window.localStorage.getItem('lts_config_snapshots');
      if (rawConfigSnapshots) {
        try {
          const parsed = JSON.parse(rawConfigSnapshots);
          if (Array.isArray(parsed)) dungCuaHangTinhGia.setState({ configSnapshots: parsed });
        } catch {}
      }

      // Quote code counter
      const rawCounter = window.localStorage.getItem('lts_quote_counter');
      if (rawCounter) {
        try {
          const parsed = JSON.parse(rawCounter);
          if (parsed && parsed.prefix) dungCuaHangTinhGia.setState({ quoteCodeConfig: parsed });
        } catch {}
      }

      // C├â┬í├é┬║├é┬Ñu h├â╞Æ├é┬¼nh v├â┬í├é┬║├é┬¡t li├â┬í├é┬╗├óΓé¼┬íu & h├â┬í├é┬║├é┬▒ng s├â┬í├é┬╗├óΓé¼╦£
      const cfgRaw = window.localStorage.getItem('lts_material_config');
      if (cfgRaw) {
        const cfg = JSON.parse(cfgRaw) as {
          materials?: Array<{ id: string; thickness: number; pricePerKg: number; inkPricePerColor: number }>;
          smallWidthPrices?: Array<{ id: string; materialId: string; widthThresholdMm: number; thickness?: number; pricePerKg: number }>;
          cpsx?: Record<string, any>;
          printWaste?: { colorSetup?: Record<number, number>; A?: number; B?: number; C?: number; D?: number };
          packaging?: { boxOptions?: BoxOption[]; boxPriceDefault?: number; bagsPerBoxDefault?: number };
          profitTable?: Array<{ threshold?: number; col1: number; col2: number; largeCol1: number; largeCol2: number }>;
        };
        dungCuaHangTinhGia.setState(s => {
          let vatLieuMoi = s.materials;
          if (cfg.materials?.length) {
            vatLieuMoi = s.materials.map(m => {
              const saved = cfg.materials!.find(x => x.id === m.id);
              if (!saved) return m;
              return { ...m, thickness: saved.thickness, pricePerKg: saved.pricePerKg, inkPricePerColor: saved.inkPricePerColor, pricePerM2: saved.pricePerKg * saved.thickness * m.density / 1000 };
            });
            // Restore custom materials
            const customMats = cfg.materials!.filter(x => x.id.startsWith('custom-'));
            for (const cm of customMats) {
              if (!vatLieuMoi.find(m => m.id === cm.id)) {
                const density = (cm as any).density ?? 1.0;
                vatLieuMoi = [...vatLieuMoi, { id: cm.id, name: (cm as any).name ?? 'Custom', group: (cm as any).group, density, thickness: cm.thickness, pricePerKg: cm.pricePerKg, isPETorPA: false, rollLength: 5000, inkPricePerColor: cm.inkPricePerColor, pricePerM2: cm.pricePerKg * cm.thickness * density / 1000 }];
              }
            }
          }
          let giaKhoNhoMoi = s.smallWidthPrices;
          if (cfg.smallWidthPrices?.length) {
            giaKhoNhoMoi = s.smallWidthPrices.map(p => {
              const saved = cfg.smallWidthPrices!.find(x => x.id === p.id);
              if (!saved) return p;
              const material = vatLieuMoi.find(m => m.id === saved.materialId);
              if (!material) return p;
              return { ...p, widthThresholdMm: saved.widthThresholdMm, thickness: saved.thickness ?? material.thickness, pricePerKg: saved.pricePerKg, pricePerM2: saved.pricePerKg * (saved.thickness ?? material.thickness) * material.density / 1000 };
            });
          }
          const hangSoMoi = { ...s.constants, ...(cfg.cpsx || {}) };
          if (cfg.packaging) {
            if (cfg.packaging.boxOptions?.length) hangSoMoi.boxOptions = cfg.packaging.boxOptions;
            if (cfg.packaging.boxPriceDefault != null) hangSoMoi.boxPriceDefault = cfg.packaging.boxPriceDefault;
            if (cfg.packaging.bagsPerBoxDefault != null) hangSoMoi.bagsPerBoxDefault = cfg.packaging.bagsPerBoxDefault;
          }
          if (cfg.printWaste) {
            if (cfg.printWaste.colorSetup) hangSoMoi.colorSetup = cfg.printWaste.colorSetup;
            if (cfg.printWaste.A != null) hangSoMoi.printWasteA = cfg.printWaste.A;
            if (cfg.printWaste.B != null) hangSoMoi.printWasteB = cfg.printWaste.B;
            if (cfg.printWaste.C != null) hangSoMoi.printWasteC = cfg.printWaste.C;
            if (cfg.printWaste.D != null) hangSoMoi.printWasteD = cfg.printWaste.D;
          }
          let loiNhuanMoi = s.profitTable;
          if (cfg.profitTable?.length) {
            loiNhuanMoi = cfg.profitTable.map((row, i) => ({
              threshold: row.threshold ?? s.profitTable[i]?.threshold ?? 0,
              col1: row.col1,
              col2: row.col2,
              largeCol1: row.largeCol1,
              largeCol2: row.largeCol2,
            }));
          }
          return { ...s, materials: vatLieuMoi, smallWidthPrices: giaKhoNhoMoi, constants: hangSoMoi, profitTable: loiNhuanMoi };
        });
        dungCuaHangTinhGia.getState().recalculate();
      }
    } catch { /* localStorage l├â┬í├é┬╗├óΓé¼ΓÇ¥i */ }

    // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ Auto-apply phi├â╞Æ├é┬¬n b├â┬í├é┬║├é┬ún ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓé¼┬╣nh m├â┬í├é┬╗├é┬⌐c m├â┬í├é┬╗├óΓé¼┬║i nh├â┬í├é┬║├é┬Ñt t├â┬í├é┬╗├é┬½ server (1 request) ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
    void (async () => {
      const store = dungCuaHangTinhGia.getState();
      if (!store.isAuthenticated || !store.accessToken) return;

      // Nhuong bandwidth cho deep-link path /bao-gia/ /tinh-gia/
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const hasDeep = /\/(bao-gia|tinh-gia)\//.test(path);
      if (hasDeep) {
        await new Promise((r) => setTimeout(r, 800));
      }
      await dungCuaHangTinhGia.getState().taiCauHinhMoiNhatTuServer();
    })();
  }, []);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ T├â┬í├é┬║├é┬úi l├â┬í├é┬╗├óΓé¼┬╣ch s├â┬í├é┬╗├é┬¡ t├â┬í├é┬╗├é┬½ server khi ├âΓÇ₧├óΓé¼╦£├âΓÇ₧├åΓÇÖng nh├â┬í├é┬║├é┬¡p th├â╞Æ├é┬ánh c├â╞Æ├é┬┤ng ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  const daDangNhapTruoc = useRef(false);
  useEffect(() => {
    if (daDangNhap && !daDangNhapTruoc.current) {
      dungCuaHangTinhGia.getState().taiLichSuTuServer().catch(() => {});
    }
    daDangNhapTruoc.current = daDangNhap;
  }, [daDangNhap]);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ L├âΓÇá├é┬░u UI prefs ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  useEffect(() => {
    window.localStorage.setItem('lts_ui_prefs', JSON.stringify({ kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao }));
  }, [kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao]);

  // ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼ L├âΓÇá├é┬░u config cache ├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼├â┬ó├óΓé¼┬¥├óΓÇÜ┬¼
  useEffect(() => {
    window.localStorage.setItem('lts_material_config', JSON.stringify({
      materials: danhSachVatLieu.map((m: Material) => ({ id: m.id, name: m.id.startsWith('custom-') ? m.name : undefined, group: m.group, density: m.id.startsWith('custom-') ? m.density : undefined, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor })),
      smallWidthPrices: bangGiaKhoNho.map(p => ({ id: p.id, materialId: p.materialId, widthThresholdMm: p.widthThresholdMm, thickness: p.thickness, pricePerKg: p.pricePerKg })),
      cpsx: {
        ghepCPSX: hangSo.ghepCPSX, laborCost: hangSo.laborCost,
        cutBase: hangSo.cutBase, cutThreshold1: hangSo.cutThreshold1, cutThreshold2: hangSo.cutThreshold2,
        cutMult1: hangSo.cutMult1, cutMult2: hangSo.cutMult2, cutMult3: hangSo.cutMult3,
        cutRules: hangSo.cutRules,
        cylinderPricePerUnit: hangSo.cylinderPricePerUnit,
        nhuPrice: hangSo.nhuPrice, moPrice: hangSo.moPrice,
        zipperPrice: hangSo.zipperPrice, zipperWeight: hangSo.zipperWeight,
        tapePrice: hangSo.tapePrice, tapeWeight: hangSo.tapeWeight,
        handlePrice: hangSo.handlePrice, handleWeight: hangSo.handleWeight, handleOptions: hangSo.handleOptions,
        customCylTypes: hangSo.customCylTypes,
        customPaymentDays: hangSo.customPaymentDays,
        customAccessories: hangSo.customAccessories,
      },
      packaging: {
        boxOptions: hangSo.boxOptions,
        boxPriceDefault: hangSo.boxPriceDefault,
        bagsPerBoxDefault: hangSo.bagsPerBoxDefault,
      },
      printWaste: { colorSetup: hangSo.colorSetup, A: hangSo.printWasteA, B: hangSo.printWasteB, C: hangSo.printWasteC, D: hangSo.printWasteD },
      profitTable: bangLoiNhuan.map((r: ProfitRow) => ({ threshold: r.threshold, col1: r.col1, col2: r.col2, largeCol1: r.largeCol1, largeCol2: r.largeCol2 })),
    }));
  }, [danhSachVatLieu, bangGiaKhoNho, hangSo, bangLoiNhuan]);

  const gridStyle: React.CSSProperties = (coTheAnPanelNhap && doRongTrai != null && !anPanelNhap)
    ? {
        gridTemplateColumns: `${doRongTrai}px 4px minmax(760px, 1fr)`,
        width: `max(100%, ${doRongTrai + 4 + 760}px)`,
      }
    : {};
  const coKetQua = Boolean(ketQua);
  const coKetQuaMobile = laMobile && coKetQua;

  const { quoteWizardSnapshot } = dungCuaHangTinhGia();
  const dangTuBaoGia = !!quoteWizardSnapshot;

  const quayLaiBaoGia = () => {
    dieuHuongMenuApp('tao-bao-gia');
  };

  return (
    <>
      <div className="toast-container" id="toastContainer" />

      {dangTuBaoGia && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(8,145,178,0.08), rgba(8,145,178,0.03))",
            border: "1px solid rgba(8,145,178,0.25)",
            borderRadius: 10,
            padding: "10px 16px",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <FileText size={16} style={{ color: "var(--accent, #0891b2)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--foreground, #111)" }}>
              ├âΓÇ₧├é┬Éang xem l├â┬í├é┬║├é┬íi t├â┬í├é┬╗├é┬½ b├â╞Æ├é┬ío gi├â╞Æ├é┬í
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>
              B├â┬í├é┬║├é┬ín ├âΓÇ₧├óΓé¼╦£ang xem b├â┬í├é┬║├é┬úng t├â╞Æ├é┬¡nh gi├â╞Æ├é┬í c├â┬í├é┬╗├é┬ºa s├â┬í├é┬║├é┬ún ph├â┬í├é┬║├é┬⌐m trong b├â╞Æ├é┬ío gi├â╞Æ├é┬í. Nh├â┬í├é┬║├é┬Ñn quay l├â┬í├é┬║├é┬íi ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├åΓÇÖ ti├â┬í├é┬║├é┬┐p t├â┬í├é┬╗├é┬Ñc t├â┬í├é┬║├é┬ío b├â╞Æ├é┬ío gi├â╞Æ├é┬í.
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            onClick={quayLaiBaoGia}
          >
            <ArrowLeft size={14} /> Quay l├â┬í├é┬║├é┬íi b├â╞Æ├é┬ío gi├â╞Æ├é┬í
          </button>
        </div>
      )}

      {!laMobile && doRongTrai != null && (
        <div className="panel-resize-hint">
          <span>Panel nh├â┬í├é┬║├é┬¡p: {doRongTrai}px</span>
          <button onClick={() => datDoRongTrai(null)} title="├âΓÇ₧├é┬É├â┬í├é┬║├é┬╖t l├â┬í├é┬║├é┬íi ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓÇ₧┬ó r├â┬í├é┬╗├óΓÇ₧┬óng m├â┬í├é┬║├é┬╖c ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓé¼┬╣nh">├â┬ó├óΓé¼┬á├é┬║ M├â┬í├é┬║├é┬╖c ├âΓÇ₧├óΓé¼╦£├â┬í├é┬╗├óΓé¼┬╣nh</button>
        </div>
      )}

      <div className="container mobile-calc-container">
        <div className={`main-grid ${coTheAnPanelNhap && anPanelNhap ? 'main-grid--input-collapsed' : ''}`} style={gridStyle}>

          {!dangChonCheDo && coTheAnPanelNhap && anPanelNhap && (
            <button
              type="button"
              className="input-panel-rail"
              onClick={() => datAnPanelNhap(false)}
              title="Mß╗ƒ phß║ºn nhß║¡p liß╗çu"
              aria-label="Mß╗ƒ phß║ºn nhß║¡p liß╗çu"
            >
              <span className="input-panel-rail-icon">ΓÇ║</span>
              <span className="input-panel-rail-text">Nhß║¡p liß╗çu</span>
            </button>
          )}

          {/* Panel tr├â╞Æ├é┬íi: nh├â┬í├é┬║├é┬¡p li├â┬í├é┬╗├óΓé¼┬íu */}
          <div
            id="inputCard"
            className={`grid-col-input ${!coKetQuaMobile || tabMobile === 'input' ? 'active' : ''}`}
            style={dangChonCheDo ? { gridColumn: '1 / -1', maxWidth: 760, margin: '0 auto', width: '100%' } : undefined}
          >
            {!dangChonCheDo && laMobile && tabMobile === 'input' && ketQua && (
              <ThanhGiaMini onNhan={() => datTabMobile('result')} />
            )}
            {dangChonCheDo
              ? <ManHinhChonCheDoTinhGia onChon={xuLyChonCheDoTinhGia} />
              : <TheNhapLieu onCollapseInput={coTheAnPanelNhap ? () => datAnPanelNhap(true) : undefined} />}
          </div>

          {/* Thanh k├â╞Æ├é┬⌐o desktop */}
          {!dangChonCheDo && coTheAnPanelNhap && !anPanelNhap && (
            <ThanhKeoPanel onKeo={xuLyKeoPanel} />
          )}

          {/* Panel ph├â┬í├é┬║├é┬úi: k├â┬í├é┬║├é┬┐t qu├â┬í├é┬║├é┬ú */}
          {!dangChonCheDo && <div
            id="resultArea"
            className={`grid-col-result ${!laMobile || (coKetQuaMobile && tabMobile === 'result') ? 'active' : ''}`}
          >
            <ManHinhQuanLy />
            <ManHinhKyThuat />
          </div>}

        </div>

        {/* Nav mobile ch├â┬í├é┬╗├óΓé¼┬░ xu├â┬í├é┬║├é┬Ñt hi├â┬í├é┬╗├óΓé¼┬ín sau khi nh├â┬í├é┬║├é┬¡p li├â┬í├é┬╗├óΓé¼┬íu h├â┬í├é┬╗├é┬úp l├â┬í├é┬╗├óΓé¼┬í v├â╞Æ├é┬á ├âΓÇ₧├óΓé¼╦£├â╞Æ├é┬ú c├â╞Æ├é┬│ k├â┬í├é┬║├é┬┐t qu├â┬í├é┬║├é┬ú. */}
        {!dangChonCheDo && coKetQua && (
          <nav className="mobile-calc-nav" aria-label="├âΓÇ₧├é┬Éi├â┬í├é┬╗├é┬üu h├âΓÇá├é┬░├â┬í├é┬╗├óΓé¼┬║ng m├â╞Æ├é┬án h├â╞Æ├é┬¼nh t├â╞Æ├é┬¡nh gi├â╞Æ├é┬í">
            <button className={`m-tab ${tabMobile === 'input' ? 'active' : ''}`}
              onClick={() => datTabMobile('input')} aria-pressed={tabMobile === 'input'}>
              ├â┬░├à┬╕├óΓé¼┼ô├óΓé¼┬╣ Nh├â┬í├é┬║├é┬¡p li├â┬í├é┬╗├óΓé¼┬íu
            </button>
            <button className={`m-tab ${tabMobile === 'result' ? 'active' : ''}`}
              onClick={() => datTabMobile('result')} aria-pressed={tabMobile === 'result'}>
              ├â┬░├à┬╕├óΓé¼Γäó├é┬░ K├â┬í├é┬║├é┬┐t qu├â┬í├é┬║├é┬ú
              <div className="m-tab-badge" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
