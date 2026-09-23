/**
 * Touch-driven swipe-to-dismiss engine (architecture plan §3.2).
 *
 * Design constraints that drive this implementation:
 *  - `touchmove` is bound **imperatively** with `{ passive: false }`. Vue's
 *    `.passive` template modifier would make the listener passive and silently
 *    break `event.preventDefault()`, letting the page scroll while the user
 *    drags a toast horizontally.
 *  - The gesture claims the horizontal axis only once, and only when the
 *    horizontal delta actually dominates, so vertical scrolling keeps working
 *    inside the message body.
 *  - Translation is continuous with opacity decay toward the threshold, and
 *    release either springs back or commits and animates the card off-screen
 *    before the dismissal callback runs.
 */

import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties, type Ref } from 'vue';

import {
  DISMISS_EXIT_DURATION,
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_THRESHOLD,
} from '@/utils/constants';

/** Resolved phase of the gesture state machine. */
export type SwipePhase = 'idle' | 'dragging' | 'snapping' | 'committing';

export interface UseSwipeDismissOptions {
  /**
   * Template ref of the swipeable element, owned by the caller.
   *
   * This MUST be the same ref object the template binds (`ref="rootRef"`).
   * A privately created ref is unreachable from the template, so it stays
   * `null` forever, `onMounted` bails out early, and the non-passive
   * `touchmove` listener is never attached.
   */
  element?: Ref<HTMLElement | null>;
  /** Invoked once the exit animation finishes; performs the real dismissal. */
  onDismiss: () => void;
  /** Gate for the gesture (non-dismissible toasts pass `() => false`). */
  enabled?: () => boolean;
  /** Commit distance in pixels. Defaults to the library-wide 96px. */
  threshold?: number;
  /** Commit velocity in px/ms. Defaults to 0.4. */
  velocityThreshold?: number;
}

export interface UseSwipeDismissReturn {
  /** Template ref for the swipeable element. */
  elementRef: Ref<HTMLElement | null>;
  /** Inline style to bind on the swipeable element. */
  swipeStyle: Ref<CSSProperties>;
  /** Transition class toggled while dragging/snapping/committing. */
  swipeClass: Ref<string>;
  /** True while a horizontal drag is in progress. */
  isDragging: Ref<boolean>;
  /** `@touchstart.passive` handler. */
  onTouchStart: (event: TouchEvent) => void;
  /**
   * Move handler. The composable binds it itself with `{ passive: false }`;
   * it is exposed for custom bindings and headless tests.
   */
  onTouchMove: (event: TouchEvent) => void;
  /** `@touchend` handler. */
  onTouchEnd: (event: TouchEvent) => void;
  /** `@touchcancel` handler. */
  onTouchCancel: (event: TouchEvent) => void;
  /** Aborts any in-flight gesture and restores the resting position. */
  reset: () => void;
}

export function useSwipeDismiss(options: UseSwipeDismissOptions): UseSwipeDismissReturn {
  const threshold = options.threshold ?? SWIPE_THRESHOLD_PX;
  const velocityThreshold = options.velocityThreshold ?? SWIPE_VELOCITY_THRESHOLD;

  /**
   * Resolved element ref. When the caller hands in its template ref we adopt
   * that exact object; the internal ref only exists for headless usage where
   * no template binding is involved.
   */
  const internalElementRef = ref<HTMLElement | null>(null);
  const elementRef: Ref<HTMLElement | null> = options.element ?? internalElementRef;
  const phase = ref<SwipePhase>('idle');
  const offsetX = ref(0);
  const opacity = ref(1);
  const exitDirection = ref<-1 | 1>(1);
  /** Set once the exit animation finished: the card stays off-screen. */
  const hasExited = ref(false);

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let axis: 'undecided' | 'horizontal' | 'vertical' | 'abandoned' = 'undecided';
  let exitTimer: ReturnType<typeof setTimeout> | null = null;
  let snapTimer: ReturnType<typeof setTimeout> | null = null;

  const swipeStyle = computed<CSSProperties>(() => {
    // Once the exit animation has run, the card stays parked off-screen until
    // the store unmounts it — the gesture machine itself returns to idle so a
    // later gesture can never be permanently locked out.
    if (hasExited.value) {
      return {
        transform: `translate3d(${exitDirection.value * 100}vw, 0, 0)`,
        opacity: '0',
      };
    }

    switch (phase.value) {
      case 'dragging':
        return {
          transform: `translate3d(${offsetX.value}px, 0, 0)`,
          opacity: String(opacity.value),
        };
      case 'snapping':
        return { transform: 'translate3d(0, 0, 0)', opacity: '1' };
      case 'committing':
        return {
          transform: `translate3d(${exitDirection.value * 100}vw, 0, 0)`,
          opacity: '0',
        };
      case 'idle':
      default:
        return {};
    }
  });

  const swipeClass = computed(() => {
    switch (phase.value) {
      case 'dragging':
        return 'toast-swiping';
      case 'snapping':
      case 'committing':
        return 'toast-snapping';
      case 'idle':
      default:
        return '';
    }
  });

  const isDragging = computed(() => phase.value === 'dragging');

  function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  function clearTimers(): void {
    if (exitTimer !== null) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }

    if (snapTimer !== null) {
      clearTimeout(snapTimer);
      snapTimer = null;
    }
  }

  function reset(): void {
    clearTimers();
    phase.value = 'idle';
    offsetX.value = 0;
    opacity.value = 1;
    hasExited.value = false;
    axis = 'undecided';
  }

  function onTouchStart(event: TouchEvent): void {
    if (phase.value === 'committing' || hasExited.value) {
      return;
    }

    if (!(options.enabled?.() ?? true)) {
      return;
    }

    // Multi-touch gestures (pinch/zoom) are never treated as a swipe. The axis
    // is left in `abandoned` so the remaining fingers of this same gesture
    // cannot resume dragging from a stale origin.
    if (event.touches.length > 1) {
      clearTimers();
      phase.value = 'idle';
      offsetX.value = 0;
      opacity.value = 1;
      axis = 'abandoned';
      return;
    }

    const touch = event.touches.item(0);

    if (touch === null) {
      return;
    }

    clearTimers();
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = now();
    axis = 'undecided';
    phase.value = 'idle';
    offsetX.value = 0;
    opacity.value = 1;
  }

  /**
   * Bound imperatively in `onMounted` with `{ passive: false }` — being allowed
   * to cancel the scroll is the entire point of this composable.
   */
  function handleTouchMove(event: TouchEvent): void {
    if (phase.value === 'committing' || axis === 'abandoned') {
      return;
    }

    const touch = event.touches.item(0);

    if (touch === null) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (axis === 'undecided') {
      // Ignore the first few pixels so a tap does not jitter the card.
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) {
        return;
      }

      axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (axis === 'vertical') {
      return;
    }

    // Claim the axis: cancel the vertical scroll that would otherwise fight us.
    if (event.cancelable) {
      event.preventDefault();
    }

    phase.value = 'dragging';
    offsetX.value = deltaX;
    opacity.value = Math.max(0, 1 - Math.abs(deltaX) / threshold);
  }

  function springBack(): void {
    phase.value = 'snapping';
    offsetX.value = 0;
    opacity.value = 1;

    snapTimer = setTimeout(() => {
      snapTimer = null;
      phase.value = 'idle';
    }, 280);
  }

  function commit(direction: -1 | 1): void {
    phase.value = 'committing';
    exitDirection.value = direction;
    opacity.value = 0;

    exitTimer = setTimeout(() => {
      exitTimer = null;
      hasExited.value = true;
      phase.value = 'idle';
      options.onDismiss();
    }, DISMISS_EXIT_DURATION);
  }

  function onTouchEnd(event: TouchEvent): void {
    if (phase.value === 'committing') {
      return;
    }

    if (phase.value !== 'dragging') {
      // A tap or a vertical scroll: restore the resting state when needed.
      if (axis === 'horizontal') {
        reset();
      }

      return;
    }

    const touch = event.changedTouches.item(0);
    const endX = touch?.clientX ?? startX + offsetX.value;
    const deltaX = endX - startX;

    const elapsed = Math.max(1, now() - startTime);
    const velocity = deltaX / elapsed;

    const passedDistance = Math.abs(deltaX) >= threshold;
    const passedVelocity = Math.abs(velocity) >= velocityThreshold && Math.abs(deltaX) > 12;

    if (passedDistance || passedVelocity) {
      commit(deltaX < 0 ? -1 : 1);
      return;
    }

    springBack();
  }

  function onTouchCancel(): void {
    if (phase.value === 'committing') {
      return;
    }

    reset();
  }

  onMounted(() => {
    const element = elementRef.value;

    if (element === null) {
      return;
    }

    element.addEventListener('touchmove', handleTouchMove, { passive: false });
  });

  onBeforeUnmount(() => {
    clearTimers();
    elementRef.value?.removeEventListener('touchmove', handleTouchMove);
  });

  return {
    elementRef,
    swipeStyle,
    swipeClass,
    isDragging,
    onTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd,
    onTouchCancel,
    reset,
  };
}
