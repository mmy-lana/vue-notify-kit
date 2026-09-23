/**
 * Anchor resolution shared by the store's eviction policy and the toast
 * viewport's layout.
 *
 * Both sides MUST agree on which visual stack a notification occupies. When the
 * store evicted on the raw `position` while the viewport rendered a normalized
 * one, three separate source anchors fed a single mobile stack: the documented
 * per-anchor cap of 5 silently became a combined cap of 15.
 *
 * Pure and DOM-free so it can run under SSR and in plain unit tests.
 */

import type { NotificationPosition } from '@/types/notify';

import { MOBILE_BREAKPOINT_PX } from './constants';

/**
 * Resolves the anchor a notification actually occupies at a given viewport
 * width. Below the breakpoint every position collapses to the matching centered
 * anchor, so thumb reach and swipe gestures stay consistent on small screens.
 */
export function resolveEffectivePosition(
  position: NotificationPosition,
  viewportWidth: number,
  breakpoint: number = MOBILE_BREAKPOINT_PX,
): NotificationPosition {
  if (viewportWidth >= breakpoint) {
    return position;
  }

  return position.startsWith('top') ? 'top-center' : 'bottom-center';
}
