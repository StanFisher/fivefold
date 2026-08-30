export type ThemeMode = 'light' | 'dark' | 'system';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('fivefold-theme') as ThemeMode) || 'system';
}

export function setStoredTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fivefold-theme', theme);
  applyTheme(theme);
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export function setupSystemThemeListener() {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const currentStored = getStoredTheme();
    if (currentStored === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
