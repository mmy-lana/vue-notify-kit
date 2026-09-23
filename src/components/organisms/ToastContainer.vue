<template>
  <Teleport :to="teleportTo">
    <div class="pointer-events-none fixed inset-0 z-toast" aria-live="off">
      <div
        v-for="anchor in NOTIFICATION_POSITIONS"
        :key="anchor"
        :data-anchor="anchor"
        :data-active="isAnchorVisible(anchor) ? 'true' : 'false'"
        :class="[
          'absolute max-h-full p-2 sm:p-3',
          ANCHOR_CLASSES[anchor],
          isExpanded(anchor) ? 'toast-anchor' : 'toast-anchor-grid',
        ]"
        @pointerenter="hoveredAnchor = anchor"
        @pointerleave="hoveredAnchor = null"
        @focusin="hoveredAnchor = anchor"
        @focusout="handleFocusOut(anchor, $event)"
      >
        <!--
          TransitionGroup renders a fragment (no wrapper element), so the layout
          class must live on the anchor itself — a class passed to the group
          would be copied onto every card instead.
        -->
        <TransitionGroup
          enter-active-class="toast-enter-active"
          :enter-from-class="isTopEdge(anchor) ? 'toast-from-top' : 'toast-from-bottom'"
          leave-active-class="toast-leave-active"
          :leave-to-class="isTopEdge(anchor) ? 'toast-to-top' : 'toast-to-bottom'"
          move-class="toast-move"
        >
          <div
            v-for="(item, index) in grouped[anchor]"
            :key="item.id"
            :class="SLOT_CLASSES"
            :style="stackStyle(anchor, index, grouped[anchor].length)"
          >
            <ToastItem
              :item="item"
              :is-interactive="isSlotInteractive(anchor, index)"
              @dismiss="dismiss(item.id, $event)"
              @pause="pause(item.id)"
              @resume="resume(item.id)"
            />
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue';

import ToastItem from '@/components/molecules/ToastItem.vue';
import { useNotify } from '@/composables/useNotify';
import type { NotificationItem, NotificationPosition, StackingMode } from '@/types/notify';
import { MOBILE_BREAKPOINT_PX, NOTIFICATION_POSITIONS } from '@/utils/constants';
import { resolveEffectivePosition } from '@/utils/position';

const props = withDefaults(
  defineProps<{
    /** Layout of simultaneously visible notifications per anchor. */
    stackingMode?: StackingMode;
    /** Viewport width below which anchors normalize to a centered position. */
    mobileBreakpoint?: number;
    /** Teleport target; `body` keeps the viewport above every app surface. */
    teleportTo?: string;
  }>(),
  {
    stackingMode: 'expanded',
    mobileBreakpoint: MOBILE_BREAKPOINT_PX,
    teleportTo: 'body',
  },
);

const { byPosition, notifications, dismiss, pause, resume } = useNotify();

const hoveredAnchor = ref<NotificationPosition | null>(null);
const viewportWidth = ref(getViewportWidth());

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY;
  }

  return window.innerWidth;
}

function handleResize(): void {
  viewportWidth.value = getViewportWidth();
}

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize, { passive: true });
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});

/**
 * Mobile normalization: every position collapses to the matching centered
 * anchor, so thumb reach and swipe gestures stay consistent on small screens.
 * Delegated to the shared resolver so the viewport and the store's eviction
 * policy can never disagree about which stack an item occupies.
 */
function resolvePosition(position: NotificationPosition): NotificationPosition {
  return resolveEffectivePosition(position, viewportWidth.value, props.mobileBreakpoint);
}

const grouped = computed<Record<NotificationPosition, NotificationItem[]>>(() => {
  const buckets = Object.fromEntries(
    NOTIFICATION_POSITIONS.map((position) => [position, [] as NotificationItem[]]),
  ) as Record<NotificationPosition, NotificationItem[]>;

  for (const position of NOTIFICATION_POSITIONS) {
    for (const item of byPosition.value[position]) {
      buckets[resolvePosition(item.position)].push(item);
    }
  }

  // Insertion index in the store array; later push means newer. Used as the
  // tiebreaker because `createdAt` is `Date.now()` with millisecond resolution
  // and a burst (`burstFive()` pushes six cards) routinely lands several
  // notifications inside the same millisecond.
  const insertionIndex = new Map<string, number>();

  notifications.value.forEach((item, index) => {
    insertionIndex.set(item.id, index);
  });

  // Normalization merges up to three source anchors into one bucket, so
  // concatenating the per-source lists is no longer globally chronological: a
  // newer `top-right` card would render below an older `top-left` one. Every
  // layout decision downstream (stack offsets, scale, z-index, and "newest is
  // nearest the viewport edge") assumes index 0 is the newest card, so each
  // bucket is re-sorted newest first, with ties broken by insertion order.
  for (const position of NOTIFICATION_POSITIONS) {
    buckets[position].sort((first, second) => {
      if (second.createdAt !== first.createdAt) {
        return second.createdAt - first.createdAt;
      }

      return (insertionIndex.get(second.id) ?? 0) - (insertionIndex.get(first.id) ?? 0);
    });
  }

  return buckets;
});

function isAnchorVisible(anchor: NotificationPosition): boolean {
  return grouped.value[anchor].length > 0;
}

function isTopEdge(anchor: NotificationPosition): boolean {
  return anchor.startsWith('top');
}

/** Hovering or focusing an anchor temporarily expands its stack. */
function isExpanded(anchor: NotificationPosition): boolean {
  return hoveredAnchor.value === anchor || props.stackingMode === 'expanded';
}

const ANCHOR_CLASSES: Record<NotificationPosition, string> = {
  'top-left': 'top-0 left-0 items-start',
  'top-center': 'top-0 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-0 right-0 items-end',
  // Bottom anchors reserve room for the floating quick-launch bar on mobile so
  // toasts never sit underneath it.
  'bottom-left': 'bottom-0 left-0 items-start pb-20 md:pb-3',
  'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 items-center pb-20 md:pb-3',
  'bottom-right': 'bottom-0 right-0 items-end pb-20 md:pb-3',
};

/**
 * Width policy from the responsive matrix: full-bleed with 8–12px gutters on
 * phones, capped at 400px on phablets, 380px on tablets and 420px on desktop.
 */
const SLOT_CLASSES =
  'w-[calc(100vw-1rem)] max-w-[420px] sm:w-[calc(100vw-1.5rem)] md:max-w-[380px] lg:max-w-[420px]';

const STEP_PX: Record<Exclude<StackingMode, 'expanded'>, number> = {
  stacked: 14,
  condensed: 8,
};

const SCALE_STEP: Record<Exclude<StackingMode, 'expanded'>, number> = {
  stacked: 0.05,
  condensed: 0.04,
};

/**
 * Offsets the cards that sit behind the front one. Items are laid out in a
 * single grid cell (`toast-anchor-grid`), so stacking never reflows the page and
 * never needs a measured container height.
 */
function stackStyle(
  anchor: NotificationPosition,
  index: number,
  total: number,
): CSSProperties {
  if (isExpanded(anchor) || total <= 1) {
    return {};
  }

  const mode = props.stackingMode as Exclude<StackingMode, 'expanded'>;
  const direction = isTopEdge(anchor) ? 1 : -1;
  const offset = direction * index * STEP_PX[mode];
  const scale = Math.max(0.72, 1 - index * SCALE_STEP[mode]);

  // Condensed mode hides everything past the third card to keep the anchor tidy.
  const hidden = mode === 'condensed' && index > 2;

  return {
    transform: `translate3d(0, ${offset}px, 0) scale(${scale})`,
    transformOrigin: isTopEdge(anchor) ? 'top center' : 'bottom center',
    zIndex: String(100 - index),
    opacity: hidden ? '0' : '1',
    transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out',
  };
}

/** Only the front card of a collapsed stack is focusable/clickable. */
function isSlotInteractive(anchor: NotificationPosition, index: number): boolean {
  if (isExpanded(anchor)) {
    return true;
  }

  return index === 0;
}

function handleFocusOut(anchor: NotificationPosition, event: FocusEvent): void {
  const next = event.relatedTarget as Node | null;

  if (next === null || !(event.currentTarget as HTMLElement).contains(next)) {
    if (hoveredAnchor.value === anchor) {
      hoveredAnchor.value = null;
    }
  }
}
</script>
