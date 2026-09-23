/**
 * Shared color-scheme controller.
 *
 * The stored preference (`system` | `light` | `dark`) is owned by
 * `useNotifyStorage`; this composable is the single place that reflects it onto
 * `<html class="dark">` so every surface themes consistently.
 */

import { computed, ref, watch, type ComputedRef } from 'vue';

import { useNotifyStorage } from './useNotifyStorage';
import type { ColorTheme } from '@/types/notify';

/** Cycle order used by the header's theme button. */
export const COLOR_THEME_CYCLE: readonly ColorTheme[] = ['system', 'light', 'dark'];

const systemPrefersDark = ref(false);

let mediaQuery: MediaQueryList | null = null;
let watching = false;

function attachMediaListener(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || mediaQuery !== null) {
    return;
  }

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;

  const handler = (event: MediaQueryListEvent): void => {
    systemPrefersDark.value = event.matches;
  };

  // `addEventListener` is unavailable on very old Safari; `addListener` is the
  // legacy fallback.
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handler);
  }
}

function applyThemeClass(isDark: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', isDark);
}

export interface ColorThemeApi {
  /** Stored preference (`system` | `light` | `dark`). */
  readonly theme: ReturnType<typeof useNotifyStorage>['colorTheme'];
  /** What is actually rendered right now. */
  readonly resolvedTheme: ComputedRef<'light' | 'dark'>;
  /** Persists a preference and applies it immediately. */
  setTheme(theme: ColorTheme): void;
  /** Advances system → light → dark → system. */
  cycleTheme(): ColorTheme;
}

/**
 * Access the shared color-scheme controller. Calling it from any component is
 * safe: the media listener and the DOM effect are registered exactly once.
 */
export function useColorTheme(): ColorThemeApi {
  const { colorTheme, setColorTheme } = useNotifyStorage();

  if (!watching) {
    watching = true;
    attachMediaListener();

    watch(
      [colorTheme, systemPrefersDark],
      ([theme, prefersDark]) => {
        applyThemeClass(theme === 'dark' || (theme === 'system' && prefersDark));
      },
      { immediate: true },
    );
  }

  const resolvedTheme = computed<'light' | 'dark'>(() =>
    colorTheme.value === 'dark' || (colorTheme.value === 'system' && systemPrefersDark.value)
      ? 'dark'
      : 'light',
  );

  return {
    theme: colorTheme,
    resolvedTheme,
    setTheme(theme: ColorTheme): void {
      setColorTheme(theme);
    },
    cycleTheme(): ColorTheme {
      const index = COLOR_THEME_CYCLE.indexOf(colorTheme.value);
      const next = COLOR_THEME_CYCLE[(index + 1) % COLOR_THEME_CYCLE.length];
      setColorTheme(next);
      return next;
    },
  };
}
