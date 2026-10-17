import { useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './useTheme';

function initialTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === 'light' || applied === 'dark') return applied;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>(initialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#141b18' : '#f5f4ef');
  }, [theme]);

  function setTheme(next: Theme) {
    updateTheme(next);
    try {
      localStorage.setItem('gearflow.theme', next);
    } catch {
      // Keep the control usable when browser storage is unavailable.
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
