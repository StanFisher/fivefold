'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { getStoredTheme, setStoredTheme, setupSystemThemeListener, ThemeMode } from '@/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getStoredTheme());
    const cleanup = setupSystemThemeListener();
    return cleanup;
  }, []);

  const handleToggle = () => {
    let next: ThemeMode = 'system';
    if (theme === 'system') next = 'light';
    else if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'system';

    setTheme(next);
    setStoredTheme(next);
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-200/50 dark:bg-slate-800/50" />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
      title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
    >
      {theme === 'light' ? (
        <>
          <Sun className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : theme === 'dark' ? (
        <>
          <Moon className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Laptop className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline">Auto</span>
        </>
      )}
    </button>
  );
}
