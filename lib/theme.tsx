import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getLocalTheme, hydrateTheme, replaceRemoteTheme, setLocalTheme } from './appData';
import { useAuth } from './auth';
import type { ThemeName } from '../types';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

function applyTheme(theme: ThemeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === 'light' || theme === 'banana' || theme === 'arctic' || theme === 'summer'
      ? 'light'
      : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>(() => getLocalTheme());
  const hydratedRef = useRef(false);

  useEffect(() => {
    applyTheme(theme);
    setLocalTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    if (status !== 'ready') return;
    if (!isAuthenticated) {
      hydratedRef.current = true;
      return;
    }

    hydrateTheme(getLocalTheme()).then((remoteTheme) => {
      if (!active) return;
      hydratedRef.current = true;
      setThemeState(remoteTheme);
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

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  return useContext(ThemeContext);
}

