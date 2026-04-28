// ═══════════════════════════════════════════════════════════════════════════
// Chủ đề Material 3 — brand color LTS (xanh #1e40af)
// Dùng chung cho PaperProvider + nội dung app
// ═══════════════════════════════════════════════════════════════════════════
import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';

// Brand color — đồng bộ với web (splash screen)
const MAU_BRAND = '#1e40af';       // blue-800
const MAU_BRAND_SANG = '#3b82f6';  // blue-500
const MAU_PHU = '#059669';         // green-600 (approved)
const MAU_CANH_BAO = '#d97706';    // amber-600 (pending)
const MAU_LOI = '#dc2626';         // red-600

export const CHU_DE_SANG: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: MAU_BRAND,
    onPrimary: '#ffffff',
    primaryContainer: '#dbeafe',
    onPrimaryContainer: '#172554',
    secondary: MAU_PHU,
    onSecondary: '#ffffff',
    secondaryContainer: '#d1fae5',
    tertiary: MAU_CANH_BAO,
    error: MAU_LOI,
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9',
    outline: '#cbd5e1',
  },
};

export const CHU_DE_TOI: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: MAU_BRAND_SANG,
    onPrimary: '#ffffff',
    primaryContainer: '#1e3a8a',
    onPrimaryContainer: '#dbeafe',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    error: '#f87171',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    outline: '#475569',
  },
};

// Helper để lấy theme theo mode
export function layChuDe(che_do: 'sang' | 'toi'): MD3Theme {
  return che_do === 'sang' ? CHU_DE_SANG : CHU_DE_TOI;
}
