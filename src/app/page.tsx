"use client";
import React, { useEffect, useState } from 'react';
import { useCalculatorStore } from '../store/calculatorStore';
import InputCard from '../components/InputCard';
import ManagerView from '../components/ManagerView';
import TechView from '../components/TechView';

export default function App() {
  const {
    activeView, layoutType, density, theme, advancedOpen,
    materials, constants, profitTable, result,
    setActiveView, loadHistoryFromServer, loadConfigFromServer,
  } = useCalculatorStore();
  const [mobileTab, setMobileTab] = useState<'input' | 'result'>('input');

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

  // Khi kết quả tính toán tự động có giá trị hợp lệ, tự chuyển về tab manager
  useEffect(() => {
    if (result && activeView !== 'manager' && activeView !== 'config') {
      setActiveView('manager');
    }
  }, [result]);

  useEffect(() => {
    // ── BƯỚC 1: Load localStorage ngay lập tức (fallback offline, sync) ───────
    try {
      // UI prefs — chỉ lưu local, không cần server
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

      // History: load nhanh từ localStorage, server sẽ override sau
      const raw = window.localStorage.getItem('lts_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Backfill: item cũ chưa có quoteStatus → gán 'drafted'
          const patched = parsed.map((h: any) => ({
            ...h,
            quoteStatus: h.quoteStatus ?? 'drafted',
          }));
          useCalculatorStore.setState({ history: patched });
        }
      }

      // Config cache: load tạm thời, server sẽ override với dữ liệu mới nhất
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
          return {
            ...s,
            materials: newMaterials,
            constants: newConstants,
            profitTable: newProfit,
          };
        });
        useCalculatorStore.getState().recalculate();
      }
    } catch {
      // Bỏ qua nếu localStorage bị hỏng
    }

    // ── BƯỚC 2: One-time migration — đẩy localStorage data lên server ─────────
    // Chỉ chạy một lần, được đánh dấu bằng lts_migration_v1
    const migrationDone = window.localStorage.getItem('lts_migration_v1');
    if (!migrationDone) {
      const lsHistory = (() => {
        try {
          const r = window.localStorage.getItem('lts_history');
          return r ? JSON.parse(r) : null;
        } catch { return null; }
      })();
      const lsConfig = (() => {
        try {
          const r = window.localStorage.getItem('lts_material_config');
          return r ? JSON.parse(r) : null;
        } catch { return null; }
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

    // ── BƯỚC 3: Load dữ liệu authoritative từ server (async, override local) ──
    loadHistoryFromServer();
    loadConfigFromServer();
  }, []); // chỉ chạy một lần khi mount

  // ── Lưu UI prefs vào localStorage (không cần server) ──────────────────────
  useEffect(() => {
    window.localStorage.setItem(
      'lts_ui_prefs',
      JSON.stringify({ layoutType, density, theme, advancedOpen })
    );
  }, [layoutType, density, theme, advancedOpen]);

  // ── Lưu config cache vào localStorage (server đã xử lý, đây là offline cache) ──
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

  return (
    <>
      <div className="toast-container" id="toastContainer"></div>

      <div className="container mobile-calc-container">
        <div className="main-grid">
          {/* LEFT: INPUT FORM */}
          <div className={`grid-col-input ${mobileTab === 'input' ? 'active' : ''}`}>
            <InputCard />
          </div>

          {/* RIGHT: RESULT PANELS */}
          <div id="resultArea" className={`grid-col-result ${mobileTab === 'result' ? 'active' : ''}`}>
            <ManagerView />
            <TechView />
          </div>
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <div className="mobile-calc-nav">
          <button
            className={`m-tab ${mobileTab === 'input' ? 'active' : ''}`}
            onClick={() => setMobileTab('input')}
          >
            📋 Nhập liệu
          </button>
          <button
            className={`m-tab ${mobileTab === 'result' ? 'active' : ''}`}
            onClick={() => setMobileTab('result')}
          >
            💰 Xem Kết quả
            {result && <div className="m-tab-badge" />}
          </button>
        </div>
      </div>
    </>
  );
}
