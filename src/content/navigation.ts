/**
 * Documentation navigation model shared by `DocSidebar`, `DocHeader` (quick
 * search) and the views themselves.
 */

import type { DocNavigationSection } from '@/types/notify';

export const DOC_NAVIGATION: DocNavigationSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    items: [
      { id: 'installation', title: 'Installation', path: '/docs#installation' },
      { id: 'quick-start', title: 'Quick start', path: '/docs#quick-start', badge: '3 min' },
      { id: 'styling', title: 'Styling & theming', path: '/docs#styling' },
    ],
  },
  {
    id: 'guides',
    title: 'Guides',
    items: [
      { id: 'positions', title: 'Positions & stacking', path: '/docs#positions' },
      { id: 'timers', title: 'Timers & pausing', path: '/docs#timers' },
      { id: 'actions', title: 'Action buttons', path: '/docs#actions' },
      { id: 'promises', title: 'Promise bridge', path: '/docs#promises', badge: 'async' },
      { id: 'sound', title: 'Sound & audio', path: '/docs#sound' },
      { id: 'gestures', title: 'Swipe gestures', path: '/docs#gestures', badge: 'touch' },
      { id: 'history', title: 'History & persistence', path: '/docs#history' },
    ],
  },
  {
    id: 'reference',
    title: 'API reference',
    items: [
      { id: 'notify-api', title: 'useNotify()', path: '/docs#notify-api' },
      { id: 'item-schema', title: 'NotificationItem', path: '/docs#item-schema' },
      { id: 'store-api', title: 'Store methods', path: '/docs#store-api' },
      { id: 'accessibility', title: 'Accessibility', path: '/docs#accessibility' },
      { id: 'responsive', title: 'Responsive matrix', path: '/docs#responsive' },
    ],
  },
  {
    id: 'interactive',
    title: 'Interactive',
    items: [
      { id: 'playground', title: 'Playground workbench', path: '/', badge: 'live' },
      { id: 'history-drawer', title: 'History drawer', path: '/#history' },
    ],
  },
];

/** Flat lookup used by the header's quick-search dialog. */
export const DOC_NAVIGATION_FLAT = DOC_NAVIGATION.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
);

/** Responsive breakpoint matrix documented in the spec (plan §4). */
export const BREAKPOINT_MATRIX = [
  {
    id: 'xs',
    label: 'Mobile XS',
    range: '360 – 389px',
    navigation: 'Top bar only, full-screen slide menu, no TOC',
    toasts: 'Full width, 8px gutter, forced bottom-center',
    interaction: '44px targets, swipe active, no hover-only controls',
  },
  {
    id: 'sm',
    label: 'Mobile',
    range: '390 – 429px',
    navigation: 'Top bar only, full-screen slide menu, no TOC',
    toasts: 'Full width, 12px gutter, single column stack',
    interaction: 'Swipe active, taps pause timers',
  },
  {
    id: 'md',
    label: 'Phablet',
    range: '430 – 767px',
    navigation: 'Compact header, drawer overlay navigation',
    toasts: 'Max 400px, centered or pinned with 16px gutters',
    interaction: 'Touch swipe, history opens as a bottom sheet',
  },
  {
    id: 'lg',
    label: 'Tablet',
    range: '768 – 1023px',
    navigation: 'Collapsible icon + text sidebar, modal search',
    toasts: 'Max 380px, absolute corner positions respected',
    interaction: 'Dual pointer: touch and cursor hover pause',
  },
  {
    id: 'xl',
    label: 'Desktop',
    range: '1024px+',
    navigation: '280px sidebar, 220px sticky TOC',
    toasts: 'Max 420px, exact corner anchors',
    interaction: 'Hover pause, keyboard navigation (Esc dismisses)',
  },
] as const;

/** Icon registry excerpt surfaced in the documentation gallery. */
export const DOC_ICON_SHOWCASE = [
  'CheckCircle',
  'AlertTriangle',
  'AlertOctagon',
  'Info',
  'Loader',
  'X',
  'Copy',
  'Check',
  'Volume2',
  'VolumeX',
  'Terminal',
  'ExternalLink',
  'Sliders',
  'Bell',
  'Layers',
  'Zap',
] as const;

/** Right-hand table of contents for the documentation view. */
export const DOC_TOC = [
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'styling', label: 'Styling & theming' },
  { id: 'positions', label: 'Positions & stacking' },
  { id: 'timers', label: 'Timers & pausing' },
  { id: 'actions', label: 'Action buttons' },
  { id: 'promises', label: 'Promise bridge' },
  { id: 'sound', label: 'Sound & audio' },
  { id: 'gestures', label: 'Swipe gestures' },
  { id: 'history', label: 'History & persistence' },
  { id: 'notify-api', label: 'useNotify()' },
  { id: 'item-schema', label: 'NotificationItem' },
  { id: 'store-api', label: 'Store methods' },
  { id: 'icons', label: 'Icon registry' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'responsive', label: 'Responsive matrix' },
] as const;

/** Right-hand table of contents for the playground view. */
export const PLAYGROUND_TOC = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'configurator', label: 'Configurator' },
  { id: 'payload', label: 'Payload inspector' },
  { id: 'generated-code', label: 'Generated code' },
  { id: 'responsive-notes', label: 'Responsive notes' },
] as const;
