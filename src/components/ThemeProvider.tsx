'use client';

import React, { useEffect } from 'react';
import { applyTheme, getStoredTheme, setupSystemThemeListener } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme on client mount
    const currentTheme = getStoredTheme();
    applyTheme(currentTheme);

    // Listen to OS system preference changes
    const cleanup = setupSystemThemeListener();
    return cleanup;
  }, []);

  return <>{children}</>;
}
