"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import type { Material, ProfitRow } from '../lib/types';
import TheNhapLieu from '../components/TheNhapLieu';
import ManHinhQuanLy from '../components/ManHinhQuanLy';
import ManHinhKyThuat from '../components/ManHinhKyThuat';

// ── Format helper ─────────────────────────────────────────────────────────────
function dinhDangSo(n: number, soLe = 0): string {
  if (!n || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: soLe, maximumFractionDigits: soLe });
}

// ── Thanh giá mini (mobile) ───────────────────────────────────────────────────
function ThanhGiaMini({ onNhan }: { onNhan: () => void }) {
  const { result, currentChotGia } = dungCuaHangTinhGia();
  if (!result) return null;

  const gia = currentChotGia > 0 ? currentChotGia : result.finalPrice;
  const laMang = result.input.productType === 'mang';
  const donVi = laMang ? 'm²' : 'túi';

  return (
    <div className="mini-price-strip" onClick={onNhan} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onNhan()}
      title="Nhấn để xem kết quả chi tiết"
    >
      <div className="mps-left">
        <span className="mps-label">Giá {currentChotGia > 0 ? 'chốt' : 'đề xuất'}</span>
        <span className="mps-price">{dinhDangSo(gia, 0)} đ/{donVi}</span>
      </div>
      <div className="mps-right">
        <span className="mps-profit">LN: {dinhDangSo(result.profitRate * 100, 1)}%</span>
        <span className="mps-arrow">→ Xem chi tiết</span>
      </div>
    </div>
  );
}

// ── Thanh kéo điều chỉnh panel (desktop) ─────────────────────────────────────
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
      title="Kéo để điều chỉnh độ rộng panel nhập liệu"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="panel-resizer-handle" />
    </div>
  );
}

// ── Trang chính ───────────────────────────────────────────────────────────────
export default function TrangChinh() {
  const {
    activeView: gocNhinHienTai, layoutType: kieuBoTriCuc, density: matDoHienThi, theme: chuDe, advancedOpen: moRongNangCao,
    materials: danhSachVatLieu, constants: hangSo, profitTable: bangLoiNhuan, result: ketQua,
    setActiveView: datGocNhin,
  } = dungCuaHangTinhGia();

  const [tabMobile, datTabMobile] = useState<'input' | 'result'>('input');
  const [doRongTrai, datDoRongTrai] = useState<number | null>(null);
  const [laMobile, datLaMobile] = useState(false);

  // ── Phát hiện mobile ────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => datLaMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Tự chuyển sang kết quả khi có tính toán mới ────────────────────────────
  const ketQuaTruoc = useRef<typeof ketQua>(null);
  useEffect(() => {
    if (ketQua && ketQua !== ketQuaTruoc.current) {
      ketQuaTruoc.current = ketQua;
      if (laMobile) setTimeout(() => datTabMobile('result'), 350);
      if (gocNhinHienTai !== 'manager' && gocNhinHienTai !== 'config') datGocNhin('manager');
    }
  }, [ketQua, laMobile, gocNhinHienTai, datGocNhin]);

  // ── Vuốt trên mobile ────────────────────────────────────────────────────────
  const xVuotBatDau = useRef<number | null>(null);
  const yVuotBatDau = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    xVuotBatDau.current = e.touches[0].clientX;
    yVuotBatDau.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (xVuotBatDau.current === null || yVuotBatDau.current === null) return;
    const dx = e.changedTouches[0].clientX - xVuotBatDau.current;
    const dy = e.changedTouches[0].clientY - yVuotBatDau.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) datTabMobile('result');
      else datTabMobile('input');
    }
    xVuotBatDau.current = null;
    yVuotBatDau.current = null;
  }, []);

  const xuLyKeoPanel = useCallback((delta: number) => {
    datDoRongTrai(prev => {
      const hienTai = prev ?? 300;
      return Math.max(200, Math.min(600, hienTai + delta));
    });
  }, []);

  // ── Đồng bộ theme / layout / density ───────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', chuDe);
    document.documentElement.setAttribute('data-layout', kieuBoTriCuc);
    document.documentElement.setAttribute('data-density', matDoHienThi);
    if (gocNhinHienTai === 'config') document.documentElement.classList.add('in-config-page');
    else document.documentElement.classList.remove('in-config-page');
  }, [chuDe, kieuBoTriCuc, matDoHienThi, gocNhinHienTai]);

  // ── Khởi tạo từ localStorage ────────────────────────────────────────────────
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

      // Lịch sử
      const rawLichSu = window.localStorage.getItem('lts_history');
      if (rawLichSu) {
        const parsed = JSON.parse(rawLichSu);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const patched = parsed.map((h: any) => ({ ...h, quoteStatus: h.quoteStatus ?? 'drafted' }));
          dungCuaHangTinhGia.setState({ history: patched });
        }
      } else {
        // Lần đầu: fetch dữ liệu mẫu từ seed file
        fetch('/seed-history.json')
          .then(r => r.ok ? r.json() : [])
          .then((seed: any[]) => {
            if (Array.isArray(seed) && seed.length > 0) {
              const patched = seed.map((h: any) => ({ ...h, quoteStatus: h.quoteStatus ?? 'drafted' }));
              dungCuaHangTinhGia.setState({ history: patched });
              try { window.localStorage.setItem('lts_history', JSON.stringify(patched)); } catch {}
            }
          })
          .catch(() => {});
      }

      // LSX
      const rawLSX = window.localStorage.getItem('lts_production_orders');
      if (rawLSX) {
        const parsed = JSON.parse(rawLSX);
        if (Array.isArray(parsed)) dungCuaHangTinhGia.setState({ productionOrders: parsed });
      }

      // Cấu hình vật liệu & hằng số
      const cfgRaw = window.localStorage.getItem('lts_material_config');
      if (cfgRaw) {
        const cfg = JSON.parse(cfgRaw) as {
          materials?: Array<{ id: string; thickness: number; pricePerKg: number; inkPricePerColor: number }>;
          smallWidthPrices?: Array<{ id: string; materialId: string; widthThresholdMm: number; pricePerKg: number }>;
          cpsx?: Record<string, any>;
          printWaste?: { colorSetup?: Record<number, number>; A?: number; B?: number; C?: number; D?: number };
          profitTable?: Array<{ col1: number; col2: number }>;
        };
        dungCuaHangTinhGia.setState(s => {
          let vatLieuMoi = s.materials;
          if (cfg.materials?.length) {
            vatLieuMoi = s.materials.map(m => {
              const saved = cfg.materials!.find(x => x.id === m.id);
              if (!saved) return m;
              return { ...m, thickness: saved.thickness, pricePerKg: saved.pricePerKg, inkPricePerColor: saved.inkPricePerColor, pricePerM2: saved.pricePerKg * saved.thickness * m.density / 1000 };
            });
          }
          let giaKhoNhoMoi = s.smallWidthPrices;
          if (cfg.smallWidthPrices?.length) {
            giaKhoNhoMoi = s.smallWidthPrices.map(p => {
              const saved = cfg.smallWidthPrices!.find(x => x.id === p.id);
              if (!saved) return p;
              const material = vatLieuMoi.find(m => m.id === saved.materialId);
              if (!material) return p;
              return { ...p, widthThresholdMm: saved.widthThresholdMm, pricePerKg: saved.pricePerKg, pricePerM2: saved.pricePerKg * material.thickness * material.density / 1000 };
            });
          }
          const hangSoMoi = { ...s.constants, ...(cfg.cpsx || {}) };
          if (cfg.printWaste) {
            if (cfg.printWaste.colorSetup) hangSoMoi.colorSetup = cfg.printWaste.colorSetup;
            if (cfg.printWaste.A != null) hangSoMoi.printWasteA = cfg.printWaste.A;
            if (cfg.printWaste.B != null) hangSoMoi.printWasteB = cfg.printWaste.B;
            if (cfg.printWaste.C != null) hangSoMoi.printWasteC = cfg.printWaste.C;
            if (cfg.printWaste.D != null) hangSoMoi.printWasteD = cfg.printWaste.D;
          }
          let loiNhuanMoi = s.profitTable;
          if (cfg.profitTable?.length === s.profitTable.length) {
            loiNhuanMoi = s.profitTable.map((row, i) => ({ ...row, col1: cfg.profitTable![i].col1, col2: cfg.profitTable![i].col2 }));
          }
          return { ...s, materials: vatLieuMoi, smallWidthPrices: giaKhoNhoMoi, constants: hangSoMoi, profitTable: loiNhuanMoi };
        });
        dungCuaHangTinhGia.getState().recalculate();
      }
    } catch { /* localStorage lỗi */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lưu UI prefs ────────────────────────────────────────────────────────────
  useEffect(() => {
    window.localStorage.setItem('lts_ui_prefs', JSON.stringify({ kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao }));
  }, [kieuBoTriCuc, matDoHienThi, chuDe, moRongNangCao]);

  // ── Lưu config cache ────────────────────────────────────────────────────────
  useEffect(() => {
    window.localStorage.setItem('lts_material_config', JSON.stringify({
      materials: danhSachVatLieu.map((m: Material) => ({ id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor })),
      cpsx: {
        ghepCPSX: hangSo.ghepCPSX, laborCost: hangSo.laborCost,
        cutBase: hangSo.cutBase, cutThreshold1: hangSo.cutThreshold1, cutThreshold2: hangSo.cutThreshold2,
        cutMult1: hangSo.cutMult1, cutMult2: hangSo.cutMult2, cutMult3: hangSo.cutMult3,
        cylinderPricePerUnit: hangSo.cylinderPricePerUnit,
        nhuPrice: hangSo.nhuPrice, moPrice: hangSo.moPrice,
        zipperPrice: hangSo.zipperPrice, zipperWeight: hangSo.zipperWeight,
        tapePrice: hangSo.tapePrice, tapeWeight: hangSo.tapeWeight,
        handlePrice: hangSo.handlePrice, handleWeight: hangSo.handleWeight,
      },
      printWaste: { colorSetup: hangSo.colorSetup, A: hangSo.printWasteA, B: hangSo.printWasteB, C: hangSo.printWasteC, D: hangSo.printWasteD },
      profitTable: bangLoiNhuan.map((r: ProfitRow) => ({ col1: r.col1, col2: r.col2 })),
    }));
  }, [danhSachVatLieu, hangSo, bangLoiNhuan]);

  const gridStyle: React.CSSProperties = (!laMobile && doRongTrai != null)
    ? { gridTemplateColumns: `${doRongTrai}px 4px 1fr` }
    : {};

  return (
    <>
      <div className="toast-container" id="toastContainer" />

      {!laMobile && doRongTrai != null && (
        <div className="panel-resize-hint">
          <span>Panel nhập: {doRongTrai}px</span>
          <button onClick={() => datDoRongTrai(null)} title="Đặt lại độ rộng mặc định">↺ Mặc định</button>
        </div>
      )}

      <div
        className="container mobile-calc-container"
        onTouchStart={laMobile ? onTouchStart : undefined}
        onTouchEnd={laMobile ? onTouchEnd : undefined}
      >
        <div className="main-grid" style={gridStyle}>

          {/* Panel trái: nhập liệu */}
          <div
            id="inputCard"
            className={`grid-col-input ${tabMobile === 'input' ? 'active' : ''}`}
          >
            {laMobile && tabMobile === 'input' && ketQua && (
              <ThanhGiaMini onNhan={() => datTabMobile('result')} />
            )}
            <TheNhapLieu />
          </div>

          {/* Thanh kéo desktop */}
          {!laMobile && kieuBoTriCuc !== 'stacked' && kieuBoTriCuc !== 'bento' && (
            <ThanhKeoPanel onKeo={xuLyKeoPanel} />
          )}

          {/* Panel phải: kết quả */}
          <div
            id="resultArea"
            className={`grid-col-result ${tabMobile === 'result' ? 'active' : ''}`}
          >
            <ManHinhQuanLy />
            <ManHinhKyThuat />
          </div>

        </div>

        {/* Nav mobile */}
        <nav className="mobile-calc-nav" aria-label="Điều hướng máy tính">
          <button className={`m-tab ${tabMobile === 'input' ? 'active' : ''}`}
            onClick={() => datTabMobile('input')} aria-selected={tabMobile === 'input'}>
            📋 Nhập liệu
          </button>
          <button className={`m-tab ${tabMobile === 'result' ? 'active' : ''}`}
            onClick={() => datTabMobile('result')} aria-selected={tabMobile === 'result'}>
            💰 Kết quả
            {ketQua && <div className="m-tab-badge" aria-hidden="true" />}
          </button>
        </nav>

        {laMobile && (
          <div className="swipe-hint" aria-hidden="true">← vuốt để chuyển tab →</div>
        )}
      </div>
    </>
  );
}
