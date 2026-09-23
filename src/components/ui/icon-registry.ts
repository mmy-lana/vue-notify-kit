/**
 * Pure SVG icon registry.
 *
 * Every glyph is a 24×24 stroke drawing that inherits `currentColor`, so icons
 * theme themselves from the surrounding text color and the library ships with
 * zero additional assets. Values are compile-time constant strings only.
 */
export const ICON_REGISTRY = {
  CheckCircle: '<circle cx="12" cy="12" r="9" /><path d="m8.4 12.4 2.5 2.5 4.7-5.1" />',
  AlertTriangle:
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />',
  AlertOctagon:
    '<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86Z" /><path d="M12 8v5" /><path d="M12 16h.01" />',
  Info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />',
  Loader:
    '<path d="M12 3v3" /><path d="M12 18v3" /><path d="m5.6 5.6 2.1 2.1" /><path d="m16.3 16.3 2.1 2.1" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="m5.6 18.4 2.1-2.1" /><path d="m16.3 7.7 2.1-2.1" />',
  X: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  Check: '<path d="M20 6 9 17l-5-5" />',
  Copy: '<rect width="13" height="13" x="9" y="9" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />',
  Volume2:
    '<path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />',
  VolumeX:
    '<path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" />',
  Terminal: '<path d="m4 17 6-6-6-6" /><path d="M12 19h8" />',
  ExternalLink:
    '<path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />',
  Sliders:
    '<path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M1 14h6" /><path d="M9 8h6" /><path d="M17 16h6" />',
  Menu: '<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />',
  Search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />',
  Sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  Moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />',
  Monitor:
    '<rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />',
  Github:
    '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 4.94-1.64 4.94-5.66a4.6 4.6 0 0 0-1.28-3.2 4.3 4.3 0 0 0-.08-3.2s-1.3-.42-3.87 1.56a10.6 10.6 0 0 0-5.62 0C7.6 1.04 6.3 1.46 6.3 1.46a4.3 4.3 0 0 0-.08 3.2A4.6 4.6 0 0 0 5 7.86c0 4 1.8 5.3 4.94 5.66a3.37 3.37 0 0 0-.94 2.58V22" />',
  History:
    '<path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 3v5h5" /><path d="M12 8v4.2l3 1.8" />',
  Play: '<path d="m6 4 12 8-12 8V4Z" />',
  Trash:
    '<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />',
  Download: '<path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />',
  ChevronDown: '<path d="m6 9 6 6 6-6" />',
  ChevronRight: '<path d="m9 6 6 6-6 6" />',
  ArrowUp: '<path d="M12 20V4" /><path d="m5 11 7-7 7 7" />',
  ArrowDown: '<path d="M12 4v16" /><path d="m19 13-7 7-7-7" />',
  Bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />',
  Layers:
    '<path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" />',
  Zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />',
  Package:
    '<path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" /><path d="m4 6.5 8 4.5 8-4.5" /><path d="M12 11v9" />',
} as const;

/** Every available icon name. */
export type IconName = keyof typeof ICON_REGISTRY;

/** Registry keys as a runtime list (docs tables, icon galleries). */
export const ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[];

/** Raw inner SVG markup for an icon; `undefined` for unknown names. */
export function getIconMarkup(name: IconName): string {
  return ICON_REGISTRY[name];
}
