import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardAlt: string;

  // Borders
  border: string;
  borderSubtle: string;
  borderStrong: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  mBlue: string;           // #00A3E0 - Electric Cyan Blue
  mMotorsportBlue: string; // #0066B1 - Motorsport Deep Blue
  mBlueMuted: string;      // Transparent Blue for badges
  mRed: string;            // #E20613 - Racing Red
  mRedGlow: string;        // #FF1E27
  mRedMuted: string;       // Transparent Red for badges
  mNavy: string;           // #0C2340 - Deep Carbon Navy
  
  // Semantic Accents
  accent: string;
  accentHover: string;
  danger: string;
  success: string;
  warning: string;

  // Inputs & Controls
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Badges & Pills
  badgeBg: string;
  badgeText: string;

  // Gradients for LinearGradient
  mGradient: [string, string, string]; // ['#00A3E0', '#0066B1', '#E20613']
  blueGradient: [string, string];      // ['#00A3E0', '#0066B1']
  redGradient: [string, string];       // ['#FF1E27', '#E20613']
  cardGradient: [string, string];
  headerGradient: [string, string];

  // Ambient Glows
  ambientGlowBlue: string;
  ambientGlowRed: string;
  ambientGlowNavy: string;
}

export const darkTheme: ThemeColors = {
  background: '#080B11',
  surface: '#0E131F',
  surfaceElevated: '#141A29',
  card: '#111624',
  cardAlt: '#182033',

  border: 'rgba(255, 255, 255, 0.09)',
  borderSubtle: '#1B2336',
  borderStrong: '#26334D',

  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E14',

  mBlue: '#00A3E0',
  mMotorsportBlue: '#0066B1',
  mBlueMuted: 'rgba(0, 163, 224, 0.16)',
  mRed: '#E20613',
  mRedGlow: '#FF1E27',
  mRedMuted: 'rgba(226, 6, 19, 0.16)',
  mNavy: '#0C2340',

  accent: '#00A3E0',
  accentHover: '#38BDF8',
  danger: '#E20613',
  success: '#10B981',
  warning: '#F59E0B',

  inputBg: '#131928',
  inputBorder: '#232E45',
  inputPlaceholder: '#64748B',

  badgeBg: 'rgba(0, 163, 224, 0.16)',
  badgeText: '#00A3E0',

  mGradient: ['#00A3E0', '#0066B1', '#E20613'],
  blueGradient: ['#00A3E0', '#0066B1'],
  redGradient: ['#FF1E27', '#E20613'],
  cardGradient: ['#131828', '#0D121F'],
  headerGradient: ['#0E131F', '#080B11'],

  ambientGlowBlue: 'rgba(0, 163, 224, 0.18)',
  ambientGlowRed: 'rgba(226, 6, 19, 0.14)',
  ambientGlowNavy: 'rgba(0, 102, 177, 0.16)',
};

export const lightTheme: ThemeColors = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',

  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  mBlue: '#0066B1',
  mMotorsportBlue: '#004C85',
  mBlueMuted: 'rgba(0, 102, 177, 0.12)',
  mRed: '#E20613',
  mRedGlow: '#D90429',
  mRedMuted: 'rgba(226, 6, 19, 0.12)',
  mNavy: '#0A192F',

  accent: '#0066B1',
  accentHover: '#00A3E0',
  danger: '#E20613',
  success: '#059669',
  warning: '#D97706',

  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',

  badgeBg: 'rgba(0, 102, 177, 0.12)',
  badgeText: '#0066B1',

  mGradient: ['#00A3E0', '#0066B1', '#E20613'],
  blueGradient: ['#00A3E0', '#0066B1'],
  redGradient: ['#FF1E27', '#E20613'],
  cardGradient: ['#FFFFFF', '#F8FAFC'],
  headerGradient: ['#FFFFFF', '#F1F5F9'],

  ambientGlowBlue: 'rgba(0, 163, 224, 0.08)',
  ambientGlowRed: 'rgba(226, 6, 19, 0.06)',
  ambientGlowNavy: 'rgba(0, 102, 177, 0.07)',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  theme: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default is Dark Mode (Carbon Dark)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = themeMode === 'dark';
  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
        colors,
        theme: colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
