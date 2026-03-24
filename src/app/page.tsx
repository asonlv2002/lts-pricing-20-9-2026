"use client";
import React, { useEffect } from 'react';
import { useCalculatorStore } from '../store/calculatorStore';
import Header from '../components/Header';
import InputCard from '../components/InputCard';
import ManagerView from '../components/ManagerView';
import TechView from '../components/TechView';
import HistoryView from '../components/HistoryView';
import ConfigPage from '../components/ConfigPage';

export default function App() {
  const { activeView, layoutType, density, theme, advancedOpen } = useCalculatorStore();

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
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        useCalculatorStore.setState({ history: parsed });
      }
    } catch {
      // ignore corrupt history
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'lts_ui_prefs',
      JSON.stringify({ layoutType, density, theme, advancedOpen })
    );
  }, [layoutType, density, theme, advancedOpen]);

  return (
    <>
      <div className="toast-container" id="toastContainer"></div>
      
      <Header />

      {activeView !== 'config' ? (
        <div className="container">
          <div className="main-grid">
            
            {/* LEFT: INPUT FORM */}
            <InputCard />

            {/* RIGHT: RESULT PANELS */}
            <div id="resultArea">
              <ManagerView />
              <TechView />
              <HistoryView />
            </div>

          </div>
        </div>
      ) : (
        <ConfigPage />
      )}
    </>
  );
}
