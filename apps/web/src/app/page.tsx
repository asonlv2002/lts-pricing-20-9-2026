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

// Ã¢â€â‚¬Ã¢â€â‚¬ Format helper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function dinhDangSo(n: number, soLe = 0): string {
  if (!n || isNaN(n)) return 'Ã¢â‚¬â€';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: soLe, maximumFractionDigits: soLe });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Thanh giÃƒÂ¡ mini (mobile) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function ThanhGiaMini({ onNhan }: { onNhan: () => void }) {
  const { result, currentChotGia } = dungCuaHangTinhGia();
  if (!result) return null;

  const gia = currentChotGia > 0 ? currentChotGia : result.finalPrice;
  const laMang = result.input.productType === 'mang';
  const donVi = laMang ? 'mÃ‚Â²' : 'tÃƒÂºi';

  return (
    <div className="mini-price-strip" onClick={onNhan} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onNhan()}
      title="NhÃ¡ÂºÂ¥n Ã„â€˜Ã¡Â»Æ’ xem kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£ chi tiÃ¡ÂºÂ¿t"
    >
      <div className="mps-left">
        <span className="mps-label">GiÃƒÂ¡ {currentChotGia > 0 ? 'chÃ¡Â»â€˜t' : 'Ã„â€˜Ã¡Â»Â xuÃ¡ÂºÂ¥t'}</span>
        <span className="mps-price">{dinhDangSo(gia, 0)} Ã„â€˜/{donVi}</span>
      </div>
      <div className="mps-right">
        <span className="mps-profit">LN: {dinhDangSo(result.profitRate * 100, 1)}%</span>
        <span className="mps-arrow">Ã¢â€ â€™ Xem chi tiÃ¡ÂºÂ¿t</span>
      </div>
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Thanh kÃƒÂ©o Ã„â€˜iÃ¡Â»Âu chÃ¡Â»â€°nh panel (desktop) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
      title="KÃƒÂ©o Ã„â€˜Ã¡Â»Æ’ Ã„â€˜iÃ¡Â»Âu chÃ¡Â»â€°nh Ã„â€˜Ã¡Â»â„¢ rÃ¡Â»â„¢ng panel nhÃ¡ÂºÂ­p liÃ¡Â»â€¡u"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="panel-resizer-handle" />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Trang chÃƒÂ­nh Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
    // resetInput sets pricingEntry back to pick Ã¢â‚¬â€ force form after mode choice
    capNhatDauVao({
      pricingMode: mode,
      outsource: mode === 'outsource' ? { steps: [] } : undefined,
    });
    datPricingEntry('form');
  };


  // Ã¢â€â‚¬Ã¢â€â‚¬ PhÃƒÂ¡t hiÃ¡Â»â€¡n mobile Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    const check = () => datLaMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Ã¢â€â‚¬Ã¢â€â‚¬ TÃ¡Â»Â± chuyÃ¡Â»Æ’n sang kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£ khi cÃƒÂ³ tÃƒÂ­nh toÃƒÂ¡n mÃ¡Â»â€ºi Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ã„ÂÃ¡Â»â€œng bÃ¡Â»â„¢ theme / layout / density Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', chuDe);
    document.documentElement.setAttribute('data-layout', kieuBoTriCuc);
    document.documentElement.setAttribute('data-density', matDoHienThi);
    if (gocNhinHienTai === 'config') document.documentElement.classList.add('in-config-page');
    else document.documentElement.classList.remove('in-config-page');
  }, [chuDe, kieuBoTriCuc, matDoHienThi, gocNhinHienTai]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ KhÃ¡Â»Å¸i tÃ¡ÂºÂ¡o tÃ¡Â»Â« localStorage Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

      // LSX Ã¢â‚¬â€ khÃƒÂ´ng lÃ†Â°u local; dÃ¡Â»Ân key cÃ…Â© nÃ¡ÂºÂ¿u cÃƒÂ²n
      try { window.localStorage.removeItem('lts_production_orders'); } catch {}
      dungCuaHangTinhGia.setState({ productionOrders: [] });


      // Audit log
      // DÃ¡Â»Ân rÃƒÂ¡c localStorage nhÃ¡ÂºÂ­t kÃƒÂ½ cÃ…Â© (Ã„â€˜ÃƒÂ£ chuyÃ¡Â»Æ’n sang server-only)
      try { window.localStorage.removeItem('lts_audit_log'); } catch {}

      // Versions
      const rawVersions = window.localStorage.getItem('lts_versions');
      if (rawVersions) {
        try {
          const parsed = JSON.parse(rawVersions);
          if (Array.isArray(parsed)) dungCuaHangTinhGia.setState({ versions: parsed });
        } catch {}
      }

      // PhiÃƒÂªn bÃ¡ÂºÂ£n bÃ¡ÂºÂ£ng Ã„â€˜Ã¡Â»â€¹nh mÃ¡Â»Â©c
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

      // CÃ¡ÂºÂ¥u hÃƒÂ¬nh vÃ¡ÂºÂ­t liÃ¡Â»â€¡u & hÃ¡ÂºÂ±ng sÃ¡Â»â€˜
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
    } catch { /* localStorage lÃ¡Â»â€”i */ }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Auto-apply phiÃƒÂªn bÃ¡ÂºÂ£n Ã„â€˜Ã¡Â»â€¹nh mÃ¡Â»Â©c mÃ¡Â»â€ºi nhÃ¡ÂºÂ¥t tÃ¡Â»Â« server (1 request) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    void (async () => {
      const store = dungCuaHangTinhGia.getState();
      if (!store.isAuthenticated || !store.accessToken) return;

      // NhÃ†Â°Ã¡Â»Âng bandwidth cho deep-link bÃƒÂ¡o giÃƒÂ¡ / tÃƒÂ­nh giÃƒÂ¡
      const hasDeep =
        typeof window !== 'undefined' &&
        (window.location.search.includes('bao-gia=') ||
          window.location.search.includes('tinh-gia='));
      if (hasDeep) {
        await new Promise((r) => setTimeout(r, 800));
      }
      await dungCuaHangTinhGia.getState().taiCauHinhMoiNhatTuServer();
    })();
  }, []);

  // Ã¢â€â‚¬Ã¢â€â‚¬ TÃ¡ÂºÂ£i lÃ¡Â»â€¹ch sÃ¡Â»Â­ tÃ¡Â»Â« server khi Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p thÃƒÂ nh cÃƒÂ´ng Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const daDangNhapTruoc = useRef(false);
  useEffect(() => {
    if (daDangNhap && !daDangNhapTruoc.current) {
      dungCuaHangTinhGia.getState().taiLichSuTuServer().catch(() => {});
    }
    daDangNhapTruoc.current = daDangNhap;
  }, [daDangNhap]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ LÃ†Â°u UI prefs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    window.localStorage.setItem('lts_ui_prefs', JSON.stringify({ kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao }));
  }, [kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ LÃ†Â°u config cache Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  const { quoteWizardSnapshot, setActiveModule } = dungCuaHangTinhGia();
  const dangTuBaoGia = !!quoteWizardSnapshot;

  const quayLaiBaoGia = () => {
    setActiveModule('quotations');
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
              Ã„Âang xem lÃ¡ÂºÂ¡i tÃ¡Â»Â« bÃƒÂ¡o giÃƒÂ¡
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)" }}>
              BÃ¡ÂºÂ¡n Ã„â€˜ang xem bÃ¡ÂºÂ£ng tÃƒÂ­nh giÃƒÂ¡ cÃ¡Â»Â§a sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m trong bÃƒÂ¡o giÃƒÂ¡. NhÃ¡ÂºÂ¥n quay lÃ¡ÂºÂ¡i Ã„â€˜Ã¡Â»Æ’ tiÃ¡ÂºÂ¿p tÃ¡Â»Â¥c tÃ¡ÂºÂ¡o bÃƒÂ¡o giÃƒÂ¡.
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            onClick={quayLaiBaoGia}
          >
            <ArrowLeft size={14} /> Quay lÃ¡ÂºÂ¡i bÃƒÂ¡o giÃƒÂ¡
          </button>
        </div>
      )}

      {!laMobile && doRongTrai != null && (
        <div className="panel-resize-hint">
          <span>Panel nhÃ¡ÂºÂ­p: {doRongTrai}px</span>
          <button onClick={() => datDoRongTrai(null)} title="Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i Ã„â€˜Ã¡Â»â„¢ rÃ¡Â»â„¢ng mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh">Ã¢â€ Âº MÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh</button>
        </div>
      )}

      <div className="container mobile-calc-container">
        <div className={`main-grid ${coTheAnPanelNhap && anPanelNhap ? 'main-grid--input-collapsed' : ''}`} style={gridStyle}>

          {!dangChonCheDo && coTheAnPanelNhap && anPanelNhap && (
            <button
              type="button"
              className="input-panel-rail"
              onClick={() => datAnPanelNhap(false)}
              title="Mở phần nhập liệu"
              aria-label="Mở phần nhập liệu"
            >
              <span className="input-panel-rail-icon">›</span>
              <span className="input-panel-rail-text">Nhập liệu</span>
            </button>
          )}

          {/* Panel trÃƒÂ¡i: nhÃ¡ÂºÂ­p liÃ¡Â»â€¡u */}
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

          {/* Thanh kÃƒÂ©o desktop */}
          {!dangChonCheDo && coTheAnPanelNhap && !anPanelNhap && (
            <ThanhKeoPanel onKeo={xuLyKeoPanel} />
          )}

          {/* Panel phÃ¡ÂºÂ£i: kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£ */}
          {!dangChonCheDo && <div
            id="resultArea"
            className={`grid-col-result ${!laMobile || (coKetQuaMobile && tabMobile === 'result') ? 'active' : ''}`}
          >
            <ManHinhQuanLy />
            <ManHinhKyThuat />
          </div>}

        </div>

        {/* Nav mobile chÃ¡Â»â€° xuÃ¡ÂºÂ¥t hiÃ¡Â»â€¡n sau khi nhÃ¡ÂºÂ­p liÃ¡Â»â€¡u hÃ¡Â»Â£p lÃ¡Â»â€¡ vÃƒÂ  Ã„â€˜ÃƒÂ£ cÃƒÂ³ kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£. */}
        {!dangChonCheDo && coKetQua && (
          <nav className="mobile-calc-nav" aria-label="Ã„ÂiÃ¡Â»Âu hÃ†Â°Ã¡Â»â€ºng mÃƒÂ n hÃƒÂ¬nh tÃƒÂ­nh giÃƒÂ¡">
            <button className={`m-tab ${tabMobile === 'input' ? 'active' : ''}`}
              onClick={() => datTabMobile('input')} aria-pressed={tabMobile === 'input'}>
              Ã°Å¸â€œâ€¹ NhÃ¡ÂºÂ­p liÃ¡Â»â€¡u
            </button>
            <button className={`m-tab ${tabMobile === 'result' ? 'active' : ''}`}
              onClick={() => datTabMobile('result')} aria-pressed={tabMobile === 'result'}>
              Ã°Å¸â€™Â° KÃ¡ÂºÂ¿t quÃ¡ÂºÂ£
              <div className="m-tab-badge" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
