import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface AppearanceContextType {
  theme: Theme;
  accentColor: AccentColor;
  setTheme: (t: Theme) => void;
  setAccentColor: (c: AccentColor) => void;
  saveSettings: () => Promise<void>;
  resetToDefault: () => Promise<void>;
  isSaving: boolean;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

const API = axios.create({ baseURL: 'http://localhost:8080/api' });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const ACCENT_COLORS = {
  blue: { main: '#2563eb', hover: '#1d4ed8', light: '#eff6ff' },
  purple: { main: '#9333ea', hover: '#7e22ce', light: '#faf5ff' },
  green: { main: '#16a34a', hover: '#15803d', light: '#f0fdf4' },
  orange: { main: '#ea580c', hover: '#c2410c', light: '#fff7ed' },
  red: { main: '#dc2626', hover: '#b91c1c', light: '#fef2f2' },
};

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/appearance');
        if (res.data) {
          setThemeState(res.data.theme);
          setAccentColorState(res.data.accentColor);
        }
      } catch (e) {
        console.error('Lỗi tải Appearance Settings:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    if (localStorage.getItem('token')) {
      fetchSettings();
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (theme === 'dark' || (theme === 'system' && isSystemDark)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme(); };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    const colors = ACCENT_COLORS[accentColor];
    const styleId = 'dynamic-appearance-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      :root {
        --acc-main: ${colors.main};
        --acc-hover: ${colors.hover};
        --acc-light: ${colors.light};
      }
      .bg-blue-600 { background-color: var(--acc-main) !important; }
      .bg-blue-700, .hover\\:bg-blue-700:hover { background-color: var(--acc-hover) !important; }
      .text-blue-600 { color: var(--acc-main) !important; }
      .border-blue-600 { border-color: var(--acc-main) !important; }
      .bg-blue-50 { background-color: var(--acc-light) !important; }

      html.dark body { background-color: #0f172a; color: #f8fafc; }
      html.dark .bg-white, html.dark .panel, html.dark .app-shell, html.dark .app-topbar { 
        background-color: #1e293b !important; 
        border-color: #334155 !important; 
        color: #f8fafc !important; 
      }
      html.dark .text-slate-800, html.dark .text-slate-700, html.dark .text-gray-900 { color: #f8fafc !important; }
      html.dark .text-slate-500, html.dark .text-slate-600 { color: #cbd5e1 !important; }
      html.dark .bg-slate-50, html.dark .bg-slate-100 { background-color: #0f172a !important; border-color: #334155 !important;}
      html.dark .border-slate-200, html.dark .border-slate-100, html.dark .border-gray-200 { border-color: #334155 !important; }
      html.dark input, html.dark textarea { background-color: #0f172a !important; color: white !important; border-color: #334155 !important; }
    `;
  }, [accentColor]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await API.put('/appearance', { theme, accentColor });
    } catch (e) {
      console.error('Save appearance failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async () => {
    setThemeState('light');
    setAccentColorState('blue');
    setIsSaving(true);
    try {
      await API.put('/appearance', { theme: 'light', accentColor: 'blue' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return null; 

  return (
    <AppearanceContext.Provider value={{ theme, accentColor, setTheme: setThemeState, setAccentColor: setAccentColorState, saveSettings, resetToDefault, isSaving }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within AppearanceProvider');
  return context;
};