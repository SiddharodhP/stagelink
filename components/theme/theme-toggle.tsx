"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

/**
 * One button that swaps the theme.
 *
 * Both icons are always rendered and one is scaled away, rather than
 * swapping which element exists. Swapping would mean the icon appears at
 * whatever the theme is on the first client render, and the pre-paint script
 * may already have made that wrong for one frame; crossfading two icons that
 * are both present has nothing to pop in.
 *
 * `onDark` is for the navbar while it sits over the homepage's ink hero,
 * where the surrounding ground is dark regardless of theme.
 */
export function ThemeToggle({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        onDark
          ? "text-paper/70 hover:bg-paper/10 hover:text-paper"
          : "text-foreground/60 hover:bg-secondary hover:text-foreground"
      } ${className ?? ""}`}
    >
      {/* Each icon shows where the click goes, not where you are: a sun on
          the dark theme, a moon on the light one. */}
      <Sun
        aria-hidden
        className="absolute h-[18px] w-[18px] scale-100 rotate-0 transition-transform duration-300 light:scale-0 light:-rotate-90 motion-reduce:transition-none"
      />
      <Moon
        aria-hidden
        className="absolute h-[18px] w-[18px] scale-0 rotate-90 transition-transform duration-300 light:scale-100 light:rotate-0 motion-reduce:transition-none"
      />
    </button>
  );
}
