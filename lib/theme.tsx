import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLocalAppSize,
  getLocalTheme,
  hydrateAppSize,
  hydrateTheme,
  replaceRemoteAppSize,
  replaceRemoteTheme,
  setLocalAppSize,
  setLocalTheme,
} from './appData';
import { useAuth } from './auth';
import type { AppSizeName, ThemeName } from '../types';

export type ThemeOption = {
  value: ThemeName;
  label: string;
  description: string;
  preview: { page: string; accent: string; text: string };
};

export type AppSizeOption = {
  value: AppSizeName;
  label: string;
  description: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'dark',
    label: 'Nocturne',
    description: 'High-contrast dark system.',
    preview: { page: '#050608', accent: '#f5f5f5', text: '#f5f5f5' },
  },
  {
    value: 'light',
    label: 'Ivory',
    description: 'Paper-light default system.',
    preview: { page: '#f5f5f3', accent: '#090b10', text: '#090b10' },
  },
  {
    value: 'zen',
    label: 'Quiet Saffron',
    description: 'Calm gold on a dark field.',
    preview: { page: '#0a0b08', accent: '#d8b84f', text: '#f6f2dc' },
  },
  {
    value: 'banana',
    label: 'Golden Peel',
    description: 'Warm yellow on soft light surfaces.',
    preview: { page: '#fffdf3', accent: '#d6b728', text: '#231d08' },
  },
  {
    value: 'arctic',
    label: 'Icefall',
    description: 'Cool light theme with crisp blues.',
    preview: { page: '#eff5fb', accent: '#7aa7d8', text: '#1f2d3d' },
  },
  {
    value: 'summer',
    label: 'Solstice',
    description: 'Warm light surfaces with citrus accents.',
    preview: { page: '#fff7ef', accent: '#e8a04d', text: '#3a2410' },
  },
  {
    value: 'pitch_black',
    label: 'Voidline',
    description: 'Minimal black with graphite emphasis.',
    preview: { page: '#010101', accent: '#5e6672', text: '#b8bec7' },
  },
  {
    value: 'red',
    label: 'Emberglass',
    description: 'Dark theme with restrained ember accents.',
    preview: { page: '#090405', accent: '#b64a57', text: '#f2d7db' },
  },
];

export const APP_SIZE_OPTIONS: AppSizeOption[] = [
  { value: 's', label: 'Small', description: 'Tighter spacing and compact controls.' },
  { value: 'm', label: 'Medium', description: 'Balanced spacing and default density.' },
  { value: 'l', label: 'Large', description: 'Larger text, controls, and section rhythm.' },
];

export function isLightTheme(theme: ThemeName) {
  return theme === 'light' || theme === 'banana' || theme === 'arctic' || theme === 'summer';
}

export function getThemeOption(theme: ThemeName) {
  return THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];
}

export function getAppSizeOption(size: AppSizeName) {
  return APP_SIZE_OPTIONS.find((option) => option.value === size) ?? APP_SIZE_OPTIONS[1];
}

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  appSize: AppSizeName;
  setAppSize: (size: AppSizeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  appSize: 'm',
  setAppSize: () => {},
});

function applyAppearance(theme: ThemeName, appSize: AppSizeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.appSize = appSize;
  document.documentElement.style.colorScheme = isLightTheme(theme) ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>(() => getLocalTheme());
  const [appSize, setAppSizeState] = useState<AppSizeName>(() => getLocalAppSize());
  const hydratedRef = useRef(false);

  useEffect(() => {
    applyAppearance(theme, appSize);
    setLocalTheme(theme);
    setLocalAppSize(appSize);
  }, [theme, appSize]);

  useEffect(() => {
    let active = true;

    if (status !== 'ready') return;
    if (!isAuthenticated) {
      hydratedRef.current = true;
      return;
    }

    Promise.all([hydrateTheme(getLocalTheme()), hydrateAppSize(getLocalAppSize())]).then(([remoteTheme, remoteSize]) => {
      if (!active) return;
      hydratedRef.current = true;
      setThemeState(remoteTheme);
      setAppSizeState(remoteSize);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, status]);

  const setTheme = (nextTheme: ThemeName) => {
    setThemeState(nextTheme);
    if (status === 'ready' && isAuthenticated && hydratedRef.current) {
      void replaceRemoteTheme(nextTheme);
    }
  };

  const setAppSize = (nextSize: AppSizeName) => {
    setAppSizeState(nextSize);
    if (status === 'ready' && isAuthenticated && hydratedRef.current) {
      void replaceRemoteAppSize(nextSize);
    }
  };

  const value = useMemo(() => ({ theme, setTheme, appSize, setAppSize }), [appSize, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  return useContext(ThemeContext);
}
