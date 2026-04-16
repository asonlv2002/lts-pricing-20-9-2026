"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCalculatorStore } from '../store/calculatorStore';
import InputCard from '../components/InputCard';
import ManagerView from '../components/ManagerView';
import TechView from '../components/TechView';

// ─── Format helper ────────────────────────────────────────────
function fmtNum(n: number, d = 0): string {
  if (!n || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Sticky Mini Price Strip (mobile only) ─────────────────────────────────
// Hiển thị tóm tắt giá ngay trên form nhập liệu → user biết kết quả mà không
// cần phải switch tab. Nhấn vào để jump sang tab Kết quả.
function MiniPriceStrip({ onTap }: { onTap: () => void }) {
  const { result, currentChotGia } = useCalculatorStore();
  if (!result) return null;

  const price = currentChotGia > 0 ? currentChotGia : result.finalPrice;
  const isMang = result.input.productType === 'mang';
  const unit = isMang ? 'm²' : 'túi';

  return (
    <div className="mini-price-strip" onClick={onTap} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      title="Nhấn để xem kết quả chi tiết"
    >
      <div className="mps-left">
        <span className="mps-label">Giá {currentChotGia > 0 ? 'chốt' : 'đề xuất'}</span>
        <span className="mps-price">{fmtNum(price, 0)} đ/{unit}</span>
      </div>
      <div className="mps-right">
        <span className="mps-profit">LN: {fmtNum(result.profitRate * 100, 1)}%</span>
        <span className="mps-arrow">→ Xem chi tiết</span>
      </div>
    </div>
  );
}

// ─── Desktop Resizable Divider ─────────────────────────────────────────────
// Drag để điều chỉnh độ rộng panel trái (form nhập liệu).
function ResizableDivider({ onResize }: { onResize: (delta: number) => void }) {
  const isDragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      startX.current = e.clientX;
      onResize(delta);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResize]);

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

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const {
    activeView, layoutType, density, theme, advancedOpen,
    materials, constants, profitTable, result,
    setActiveView, loadHistoryFromServer, loadConfigFromServer,
  } = useCalculatorStore();

  // Mobile: active pane ('input' | 'result')
  const [mobileTab, setMobileTab] = useState<'input' | 'result'>('input');
  // Desktop: left panel width override (null = use CSS grid default)
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  // Is mobile viewport?
  const [isMobile, setIsMobile] = useState(false);

  // ── Detect mobile ────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Auto-jump to result when new calculation arrives ─────────
  const prevResultRef = useRef<typeof result>(null);
  useEffect(() => {
    if (result && result !== prevResultRef.current) {
      prevResultRef.current = result;
      if (isMobile) {
        // Brief delay: let green badge pulse once first
        setTimeout(() => setMobileTab('result'), 350);
      }
      if (activeView !== 'manager' && activeView !== 'config') {
        setActiveView('manager');
      }
    }
  }, [result, isMobile, activeView, setActiveView]);

  // ── Touch swipe gesture ──────────────────────────────────────
  // Swipe left → result, swipe right → input
  // Only triggers on clearly horizontal swipes (not vertical scrolling)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setMobileTab('result');
      else setMobileTab('input');
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  // ── Desktop resizable panel ──────────────────────────────────
  const handlePanelResize = useCallback((delta: number) => {
    setLeftWidth(prev => {
      const current = prev ?? 300;
      return Math.max(200, Math.min(600, current + delta));
    });
  }, []);

  // ── Theme / layout / density sync ───────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-layout', layoutType);
    document.documentElement.setAttribute('data-density', density);
    if (activeView === 'config') {
      document.documentElement.classList.add('in-config-page');
    } else {
      document.documentElement.classList.remove('in-config-page');
    }
  }, [theme, layoutType, density, activeView]);

  // ── One-time initialization from localStorage + server ───────
  useEffect(() => {
    try {
      const uiRaw = window.localStorage.getItem('lts_ui_prefs');
      if (uiRaw) {
        const ui = JSON.parse(uiRaw) as {
          layoutType?: 'default' | 'stacked' | 'wide' | 'bento';
          density?: 'compact' | 'comfortable' | 'spacious';
          theme?: 'light' | 'dark';
          advancedOpen?: boolean;
        };
        useCalculatorStore.setState((s) => ({
          ...s,
          layoutType: ui.layoutType ?? s.layoutType,
          density: ui.density ?? s.density,
          theme: ui.theme ?? s.theme,
          advancedOpen: typeof ui.advancedOpen === 'boolean' ? ui.advancedOpen : s.advancedOpen,
        }));
      }

      const raw = window.localStorage.getItem('lts_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const patched = parsed.map((h: any) => ({
            ...h,
            quoteStatus: h.quoteStatus ?? 'drafted',
          }));
          useCalculatorStore.setState({ history: patched });
        }
      }

      const cfgRaw = window.localStorage.getItem('lts_material_config');
      if (cfgRaw) {
        const cfg = JSON.parse(cfgRaw) as {
          materials?: Array<{ id: string; thickness: number; pricePerKg: number; inkPricePerColor: number }>;
          cpsx?: Partial<typeof constants>;
          printWaste?: { colorSetup?: Record<number, number>; A?: number; B?: number; C?: number; D?: number };
          profitTable?: Array<{ col1: number; col2: number }>;
        };
        useCalculatorStore.setState((s) => {
          let newMaterials = s.materials;
          if (cfg.materials?.length) {
            newMaterials = s.materials.map((m) => {
              const saved = cfg.materials!.find((x) => x.id === m.id);
              if (!saved) return m;
              return {
                ...m,
                thickness: saved.thickness,
                pricePerKg: saved.pricePerKg,
                inkPricePerColor: saved.inkPricePerColor,
                pricePerM2: saved.pricePerKg * saved.thickness * m.density / 1000,
              };
            });
          }
          const newConstants = { ...s.constants, ...(cfg.cpsx || {}) };
          if (cfg.printWaste) {
            if (cfg.printWaste.colorSetup) newConstants.colorSetup = cfg.printWaste.colorSetup;
            if (cfg.printWaste.A != null) newConstants.printWasteA = cfg.printWaste.A;
            if (cfg.printWaste.B != null) newConstants.printWasteB = cfg.printWaste.B;
            if (cfg.printWaste.C != null) newConstants.printWasteC = cfg.printWaste.C;
            if (cfg.printWaste.D != null) newConstants.printWasteD = cfg.printWaste.D;
          }
          let newProfit = s.profitTable;
          if (cfg.profitTable && cfg.profitTable.length === s.profitTable.length) {
            newProfit = s.profitTable.map((row, idx) => ({
              ...row,
              col1: cfg.profitTable![idx].col1,
              col2: cfg.profitTable![idx].col2,
            }));
          }
          return { ...s, materials: newMaterials, constants: newConstants, profitTable: newProfit };
        });
        useCalculatorStore.getState().recalculate();
      }
    } catch {
      // Ignore corrupted localStorage
    }

    const migrationDone = window.localStorage.getItem('lts_migration_v1');
    if (!migrationDone) {
      const lsHistory = (() => {
        try { const r = window.localStorage.getItem('lts_history'); return r ? JSON.parse(r) : null; }
        catch { return null; }
      })();
      const lsConfig = (() => {
        try { const r = window.localStorage.getItem('lts_material_config'); return r ? JSON.parse(r) : null; }
        catch { return null; }
      })();

      if (lsHistory || lsConfig) {
        const payload: Record<string, unknown> = {};
        if (Array.isArray(lsHistory) && lsHistory.length > 0) payload.history = lsHistory;
        if (lsConfig?.materials?.length) payload.materials = lsConfig.materials;
        if (lsConfig?.cpsx) {
          payload.constants = {
            ...lsConfig.cpsx,
            ...(lsConfig.printWaste ? {
              colorSetup: lsConfig.printWaste.colorSetup,
              printWasteA: lsConfig.printWaste.A,
              printWasteB: lsConfig.printWaste.B,
              printWasteC: lsConfig.printWaste.C,
              printWasteD: lsConfig.printWaste.D,
            } : {}),
          };
        }
        if (lsConfig?.profitTable?.length) payload.profitTable = lsConfig.profitTable;

        fetch('/api/migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-migrate-key': process.env.NEXT_PUBLIC_MIGRATE_SECRET ?? '',
          },
          body: JSON.stringify(payload),
        })
          .then(r => r.json())
          .then((result) => {
            if (result.success) {
              window.localStorage.setItem('lts_migration_v1', 'done');
              console.log('[migration] localStorage → server:', result.results);
            }
          })
          .catch(err => console.warn('[migration] Failed:', err));
      } else {
        window.localStorage.setItem('lts_migration_v1', 'done');
      }
    }

    loadHistoryFromServer();
    loadConfigFromServer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist UI prefs ────────────────────────────────────────
  useEffect(() => {
    window.localStorage.setItem(
      'lts_ui_prefs',
      JSON.stringify({ layoutType, density, theme, advancedOpen })
    );
  }, [layoutType, density, theme, advancedOpen]);

  // ── Persist config cache ─────────────────────────────────────
  useEffect(() => {
    const data = {
      materials: materials.map((m) => ({
        id: m.id,
        thickness: m.thickness,
        pricePerKg: m.pricePerKg,
        inkPricePerColor: m.inkPricePerColor,
      })),
      cpsx: {
        ghepCPSX: constants.ghepCPSX,
        laborCost: constants.laborCost,
        cutBase: constants.cutBase,
        cutThreshold1: constants.cutThreshold1,
        cutThreshold2: constants.cutThreshold2,
        cutMult1: constants.cutMult1,
        cutMult2: constants.cutMult2,
        cutMult3: constants.cutMult3,
        cylinderPricePerUnit: constants.cylinderPricePerUnit,
        nhuPrice: constants.nhuPrice,
        moPrice: constants.moPrice,
        zipperPrice: constants.zipperPrice,
        zipperWeight: constants.zipperWeight,
        tapePrice: constants.tapePrice,
        tapeWeight: constants.tapeWeight,
        handlePrice: constants.handlePrice,
        handleWeight: constants.handleWeight,
      },
      printWaste: {
        colorSetup: constants.colorSetup,
        A: constants.printWasteA,
        B: constants.printWasteB,
        C: constants.printWasteC,
        D: constants.printWasteD,
      },
      profitTable: profitTable.map((row) => ({ col1: row.col1, col2: row.col2 })),
    };
    window.localStorage.setItem('lts_material_config', JSON.stringify(data));
  }, [materials, constants, profitTable]);

  // Desktop grid override when user has dragged the divider
  const gridStyle: React.CSSProperties = (!isMobile && leftWidth != null)
    ? { gridTemplateColumns: `${leftWidth}px 4px 1fr` }
    : {};

  return (
    <>
      <div className="toast-container" id="toastContainer" />

      {/* Desktop: tiny pill showing current panel width + reset button */}
      {!isMobile && leftWidth != null && (
        <div className="panel-resize-hint">
          <span>Panel nhập: {leftWidth}px</span>
          <button onClick={() => setLeftWidth(null)} title="Đặt lại độ rộng mặc định">↺ Mặc định</button>
        </div>
      )}

      <div
        className="container mobile-calc-container"
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
      >
        <div className="main-grid" style={gridStyle}>

          {/* ── LEFT: INPUT FORM ── */}
          <div
            id="inputCard"
            className={`grid-col-input ${mobileTab === 'input' ? 'active' : ''}`}
          >
            {/* Mini price strip: visible on mobile only, while on input tab */}
            {isMobile && mobileTab === 'input' && result && (
              <MiniPriceStrip onTap={() => setMobileTab('result')} />
            )}
            <InputCard />
          </div>

          {/* ── DESKTOP RESIZER ── */}
          {!isMobile && layoutType !== 'stacked' && layoutType !== 'bento' && (
            <ResizableDivider onResize={handlePanelResize} />
          )}

          {/* ── RIGHT: RESULT PANELS ── */}
          <div
            id="resultArea"
            className={`grid-col-result ${mobileTab === 'result' ? 'active' : ''}`}
          >
            <ManagerView />
            <TechView />
          </div>

        </div>

        {/* ── MOBILE BOTTOM NAVIGATION ── */}
        <nav className="mobile-calc-nav" aria-label="Điều hướng máy tính">
          <button
            className={`m-tab ${mobileTab === 'input' ? 'active' : ''}`}
            onClick={() => setMobileTab('input')}
            aria-selected={mobileTab === 'input'}
          >
            📋 Nhập liệu
          </button>
          <button
            className={`m-tab ${mobileTab === 'result' ? 'active' : ''}`}
            onClick={() => setMobileTab('result')}
            aria-selected={mobileTab === 'result'}
          >
            💰 Kết quả
            {result && <div className="m-tab-badge" aria-hidden="true" />}
          </button>
        </nav>

        {/* Swipe hint — shown only on mobile */}
        {isMobile && (
          <div className="swipe-hint" aria-hidden="true">
            ← vuốt để chuyển tab →
          </div>
        )}
      </div>
    </>
  );
}
