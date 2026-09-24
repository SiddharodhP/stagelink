"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-script";

/**
 * Theme state for the toggle.
 *
 * The provider does not decide what the page looks like -- the class on
 * <html> already did that, before React existed on the page. This only reads
 * that class back so a control can show which way it is pointing, and writes
 * the class and localStorage when someone flips it.
 *
 * Two states, not three. "System" is a third thing to explain in a menu and
 * it would quietly override the stated default, which is dark.
 */

export type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark on the server and on the first client render, matching :root. The
  // effect below corrects it if the script added the light class, which is a
  // state update rather than a paint -- the page was already light.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("light", next === "light");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private window or blocked site data: the theme still applies for
      // this page, it just will not be remembered.
    }
    setThemeState(next);
  }, []);

  // Another tab flipping the theme should not leave this one disagreeing
  // with its own <html> class.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next: Theme = e.newValue === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("light", next === "light");
      setThemeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains("light") ? "dark" : "light"),
    [setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
