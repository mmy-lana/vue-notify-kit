/**
 * Notification store & queue engine (architecture plan §3.1).
 *
 * The store owns the reactive notification array, the per-item `requestAnimationFrame`
 * countdown tickers, the queue-eviction policy, the promise bridge, and the
 * dismissal protocol (including history logging).
 *
 * Timer design: each visible notification owns its own rAF ticker instead of a
 * `setTimeout`, so `remainingTime` is derived from real elapsed time
 * (`targetTime - performance.now()`). That keeps the progress bar honest across
 * throttled tabs, and makes pause/resume a matter of cancelling and re-arming a
 * single frame handle.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';

import type {
  CreateNotificationInput,
  NotificationAction,
  NotificationFactory,
  NotificationItem,
  NotificationPosition,
  NotifyFn,
  NotifyPromiseBridge,
  PromiseNotificationMessages,
} from '@/types/notify';
import {
  DEFAULT_DURATION,
  DISMISS_EXIT_DURATION,
  MAX_STACK_PER_POSITION,
  NOTIFICATION_POSITIONS,
  PERSISTENT_DURATION,
  isNotificationType,
} from '@/utils/constants';
import { clampDuration, createNotification as buildNotification } from '@/utils/factory';
import { monotonicNow } from '@/utils/time';

import { useNotificationSound } from './useNotificationSound';
import { useNotifyStorage } from './useNotifyStorage';

/** Public surface of the notification store. */
export interface NotifyApi {
  /** Live notification array, newest last. */
  readonly notifications: Ref<NotificationItem[]>;
  /** Push a notification; returns its id. Also exposes `notify.promise`. */
  readonly notify: NotifyFn;
  /** Canonical factory (duration clamping, enum validation, id generation). */
  readonly createNotification: NotificationFactory;
  /** Patches a live notification and reconciles its countdown ticker. */
  updateNotification(id: string, patch: Partial<NotificationItem>): void;
  /** Runs the idempotent dismissal protocol for one notification. */
  dismiss(id: string): void;
  /** Dismisses every notification, including non-dismissible ones. */
  dismissAll(): void;
  /** Dismisses every notification anchored at one position. */
  dismissPosition(position: NotificationPosition): void;
  /** Freezes a countdown at its exact remaining time. */
  pause(id: string): void;
  /** Restarts a frozen countdown from its remaining time. */
  resume(id: string): void;
  /** Freezes every auto-dismissing notification. */
  pauseAll(): void;
  /** Restarts every frozen auto-dismissing notification. */
  resumeAll(): void;
  /** Notifications grouped by resolved position, newest first in each group. */
  readonly byPosition: ComputedRef<Record<NotificationPosition, NotificationItem[]>>;
  /** Number of live (non-dismissing) notifications. */
  readonly activeCount: ComputedRef<number>;
  /** Master mute switch for the sound engine. */
  readonly isMuted: Ref<boolean>;
  /** Sets the master mute switch. */
  setMuted(value: boolean): void;
  /** Flips the master mute switch; returns the new value. */
  toggleMuted(): boolean;
  /** Detaches global listeners once the final consumer releases the store. */
  dispose(): void;
}

/* -------------------------------------------------------------------------- */
/* Singleton state                                                             */
/* -------------------------------------------------------------------------- */

const notifications = ref<NotificationItem[]>([]);

/** Frame handles keyed by notification id. */
const frameHandles = new Map<string, number>();
/** Absolute monotonic deadlines keyed by notification id. */
const timerTargets = new Map<string, number>();
/** Ids paused by the window focus-loss handler (so hover pauses are untouched). */
const focusPausedIds = new Set<string>();

let consumers = 0;
let listenersAttached = false;

const storage = useNotifyStorage();
const sound = useNotificationSound();

/* -------------------------------------------------------------------------- */
/* Frame scheduling (rAF with a timer fallback for non-browser runtimes)        */
/* -------------------------------------------------------------------------- */

const hasAnimationFrame =
  typeof globalThis.requestAnimationFrame === 'function' &&
  typeof globalThis.cancelAnimationFrame === 'function';

function scheduleFrame(callback: () => void): number {
  if (hasAnimationFrame) {
    return globalThis.requestAnimationFrame(() => {
      callback();
    });
  }

  return setTimeout(callback, 16) as unknown as number;
}

function cancelFrame(handle: number): void {
  if (hasAnimationFrame) {
    globalThis.cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
}

/* -------------------------------------------------------------------------- */
/* Timer engine                                                                */
/* -------------------------------------------------------------------------- */

function stopTicker(id: string): void {
  const handle = frameHandles.get(id);

  if (handle !== undefined) {
    cancelFrame(handle);
    frameHandles.delete(id);
  }

  timerTargets.delete(id);
}

function stopAllTickers(): void {
  for (const handle of frameHandles.values()) {
    cancelFrame(handle);
  }

  frameHandles.clear();
  timerTargets.clear();
}

/**
 * Starts (or restarts) the countdown for one notification.
 *
 * `item` must be the reactive proxy read back out of `notifications.value` —
 * mutating the raw factory result would not trigger any update.
 */
function startTicker(item: NotificationItem, targetTime: number): void {
  stopTicker(item.id);
  timerTargets.set(item.id, targetTime);

  const tick = (): void => {
    const target = timerTargets.get(item.id);

    if (target === undefined) {
      return;
    }

    if (item.isDismissing) {
      stopTicker(item.id);
      return;
    }

    if (item.isPaused) {
      // A paused item holds no frame; `resume()` re-arms it.
      frameHandles.delete(item.id);
      return;
    }

    const remaining = target - monotonicNow();

    if (remaining <= 0) {
      frameHandles.delete(item.id);
      item.remainingTime = 0;
      dismiss(item.id);
      return;
    }

    item.remainingTime = remaining;
    frameHandles.set(item.id, scheduleFrame(tick));
  };

  frameHandles.set(item.id, scheduleFrame(tick));
}

/** Re-derives ticker state from an item's current duration/pause flags. */
function reconcileTimer(item: NotificationItem): void {
  if (item.isDismissing) {
    stopTicker(item.id);
    return;
  }

  if (item.duration <= PERSISTENT_DURATION) {
    stopTicker(item.id);
    item.remainingTime = 0;
    return;
  }

  if (item.isPaused) {
    stopTicker(item.id);
    return;
  }

  const remaining = item.remainingTime > 0 ? item.remainingTime : item.duration;
  item.remainingTime = remaining;
  item.timerStartedAt = monotonicNow();
  startTicker(item, item.timerStartedAt + remaining);
}

/* -------------------------------------------------------------------------- */
/* Push pipeline                                                               */
/* -------------------------------------------------------------------------- */

function findNotification(id: string): NotificationItem | undefined {
  return notifications.value.find((item) => item.id === id);
}

function recordHistory(item: NotificationItem): void {
  storage.addHistoryRecord({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    timestamp: item.createdAt,
    dismissedAt: Date.now(),
    triggerSource: item.triggerSource,
  });
}

/**
 * Synchronous stack eviction.
 *
 * The live array is queried (never a cached count) so several `push()` calls in
 * the same tick cannot overpopulate an anchor. Sticky notifications
 * (`duration === 0`, typically promise/loading toasts) are never evicted; if a
 * full stack is entirely sticky, the incoming notification is allowed to exceed
 * the limit rather than silently dropping a pending operation.
 *
 * Evicted items are both untracked and appended to history, so the log stays a
 * complete record even though they skip the exit animation.
 */
function evictOverflow(position: NotificationPosition): void {
  const samePosition = notifications.value.filter(
    (item) => item.position === position && !item.isDismissing,
  );

  if (samePosition.length < MAX_STACK_PER_POSITION) {
    return;
  }

  const overflow = samePosition.length - MAX_STACK_PER_POSITION + 1;
  const victims = samePosition
    .filter((item) => item.duration > PERSISTENT_DURATION)
    .slice(0, overflow);

  for (const victim of victims) {
    stopTicker(victim.id);
    const index = notifications.value.indexOf(victim);

    if (index !== -1) {
      notifications.value.splice(index, 1);
    }

    recordHistory(victim);
  }
}

function push(input: CreateNotificationInput): string {
  const created = buildNotification(input);

  // Evict *before* pushing so the anchor never visibly overpopulates.
  evictOverflow(created.position);
  notifications.value.push(created);

  // Read the reactive proxy back out of the array (just appended, so the last
  // slot is guaranteed): mutating the raw factory result updates nothing.
  const item = notifications.value[notifications.value.length - 1] as NotificationItem;

  if (item.duration > PERSISTENT_DURATION) {
    startTicker(item, monotonicNow() + item.duration);
  } else {
    item.remainingTime = 0;
  }

  if (item.sound) {
    sound.play(item.type);
  }

  return item.id;
}

/* -------------------------------------------------------------------------- */
/* Update & promise bridge                                                     */
/* -------------------------------------------------------------------------- */

/** Fields a patch may safely overwrite, with runtime validation kept minimal. */
function applyPatch(target: NotificationItem, patch: Partial<NotificationItem>): boolean {
  let timerRelevant = false;
  let typeChanged = false;

  if (patch.type !== undefined && isNotificationType(patch.type) && patch.type !== target.type) {
    target.type = patch.type;
    typeChanged = true;
  }

  if (patch.title !== undefined) {
    target.title = patch.title;
  }

  if (patch.description !== undefined) {
    target.description = patch.description;
  }

  if (patch.duration !== undefined) {
    target.duration = clampDuration(patch.duration, target.duration);
    timerRelevant = true;
  }

  if (patch.remainingTime !== undefined) {
    target.remainingTime = clampDuration(patch.remainingTime, target.duration);
    timerRelevant = true;
  }

  if (patch.position !== undefined) {
    target.position = patch.position;
  }

  if (patch.dismissible !== undefined) {
    target.dismissible = patch.dismissible;
  }

  if (patch.showProgress !== undefined) {
    target.showProgress = patch.showProgress;
  }

  if (patch.pauseOnHover !== undefined) {
    target.pauseOnHover = patch.pauseOnHover;
  }

  if (patch.pauseOnFocusLoss !== undefined) {
    target.pauseOnFocusLoss = patch.pauseOnFocusLoss;
  }

  if (patch.sound !== undefined) {
    target.sound = patch.sound;
  }

  if (patch.customClass !== undefined) {
    target.customClass = patch.customClass;
  }

  if (patch.actions !== undefined) {
    target.actions = patch.actions;
  }

  if (patch.triggerSource !== undefined) {
    target.triggerSource = patch.triggerSource;
  }

  if (patch.isPaused !== undefined && patch.isPaused !== target.isPaused) {
    target.isPaused = patch.isPaused;
    timerRelevant = true;
  }

  if (patch.timerStartedAt !== undefined) {
    target.timerStartedAt = patch.timerStartedAt;
  }

  return timerRelevant || typeChanged;
}

function updateNotification(id: string, patch: Partial<NotificationItem>): void {
  const target = findNotification(id);

  if (target === undefined) {
    return;
  }

  const previousType = target.type;
  const shouldReconcile = applyPatch(target, patch);

  if (shouldReconcile) {
    reconcileTimer(target);
  }

  // A promise bridge resolving into `success`/`error` should be audible.
  if (target.type !== previousType && target.sound) {
    sound.play(target.type);
  }
}

function resolveMessage<T>(
  template: string | ((value: T) => string) | undefined,
  value: T,
): string | undefined {
  if (template === undefined) {
    return undefined;
  }

  if (typeof template === 'function') {
    try {
      return template(value);
    } catch {
      return undefined;
    }
  }

  return template;
}

const notifyPromise: NotifyPromiseBridge = async <T>(
  executor: () => Promise<T>,
  messages: PromiseNotificationMessages<T>,
): Promise<T> => {
  const id = push({
    type: 'loading',
    title: messages.loading,
    description: messages.description?.loading,
    duration: PERSISTENT_DURATION,
    dismissible: false,
    showProgress: false,
    pauseOnHover: false,
    triggerSource: 'api',
  });

  try {
    const data = await executor();

    updateNotification(id, {
      type: 'success',
      title: resolveMessage(messages.success, data) ?? 'Done',
      description: resolveMessage(messages.description?.success, data),
      duration: DEFAULT_DURATION,
      dismissible: true,
      showProgress: true,
      remainingTime: DEFAULT_DURATION,
      timerStartedAt: monotonicNow(),
      isPaused: false,
    });

    return data;
  } catch (error) {
    updateNotification(id, {
      type: 'error',
      title: resolveMessage(messages.error, error) ?? 'Something went wrong',
      description: resolveMessage(messages.description?.error, error),
      duration: DEFAULT_DURATION,
      dismissible: true,
      showProgress: true,
      remainingTime: DEFAULT_DURATION,
      timerStartedAt: monotonicNow(),
      isPaused: false,
    });

    throw error;
  }
};

const notifyFn = Object.assign(
  (input: CreateNotificationInput): string => push(input),
  { promise: notifyPromise },
) as NotifyFn;

/* -------------------------------------------------------------------------- */
/* Dismissal protocol                                                          */
/* -------------------------------------------------------------------------- */

function dismiss(id: string): void {
  const target = findNotification(id);

  // Idempotency guard: also protects the 200ms exit window from duplicate
  // history entries and double splice scheduling.
  if (target === undefined || target.isDismissing) {
    return;
  }

  target.isDismissing = true;
  stopTicker(id);
  recordHistory(target);

  setTimeout(() => {
    const index = notifications.value.findIndex((item) => item.id === id);

    if (index !== -1) {
      notifications.value.splice(index, 1);
    }

    focusPausedIds.delete(id);
  }, DISMISS_EXIT_DURATION);
}

function dismissAll(): void {
  for (const item of [...notifications.value]) {
    dismiss(item.id);
  }
}

function dismissPosition(position: NotificationPosition): void {
  for (const item of [...notifications.value]) {
    if (item.position === position) {
      dismiss(item.id);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Pause / resume                                                              */
/* -------------------------------------------------------------------------- */

function pause(id: string): void {
  const target = findNotification(id);

  if (target === undefined || target.isPaused || target.isDismissing) {
    return;
  }

  if (target.duration <= PERSISTENT_DURATION) {
    return;
  }

  // Freeze at the exact remaining time rather than the last painted frame.
  const deadline = timerTargets.get(id);

  if (deadline !== undefined) {
    target.remainingTime = Math.max(0, deadline - monotonicNow());
  }

  stopTicker(id);
  target.isPaused = true;
}

function resume(id: string): void {
  const target = findNotification(id);

  if (target === undefined || !target.isPaused || target.isDismissing) {
    return;
  }

  target.isPaused = false;

  if (target.duration <= PERSISTENT_DURATION) {
    target.remainingTime = 0;
    return;
  }

  const remaining = target.remainingTime > 0 ? target.remainingTime : target.duration;
  target.timerStartedAt = monotonicNow();
  startTicker(target, target.timerStartedAt + remaining);
}

function pauseAll(): void {
  for (const item of [...notifications.value]) {
    pause(item.id);
  }
}

function resumeAll(): void {
  for (const item of [...notifications.value]) {
    resume(item.id);
  }
}

/* -------------------------------------------------------------------------- */
/* Global listeners                                                            */
/* -------------------------------------------------------------------------- */

function handleWindowBlur(): void {
  for (const item of [...notifications.value]) {
    if (item.pauseOnFocusLoss && !item.isPaused && !item.isDismissing) {
      pause(item.id);
      focusPausedIds.add(item.id);
    }
  }
}

function handleWindowFocus(): void {
  for (const id of [...focusPausedIds]) {
    focusPausedIds.delete(id);
    resume(id);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }

  const target = [...notifications.value]
    .reverse()
    .find((item) => item.dismissible && !item.isDismissing);

  if (target !== undefined) {
    dismiss(target.id);
  }
}

function attachListeners(): void {
  if (listenersAttached || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);
  window.addEventListener('keydown', handleKeydown);
  listenersAttached = true;
}

function detachListeners(): void {
  if (!listenersAttached || typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('blur', handleWindowBlur);
  window.removeEventListener('focus', handleWindowFocus);
  window.removeEventListener('keydown', handleKeydown);
  listenersAttached = false;
}

/* -------------------------------------------------------------------------- */
/* Derived state                                                               */
/* -------------------------------------------------------------------------- */

const byPosition = computed<Record<NotificationPosition, NotificationItem[]>>(() => {
  const grouped = Object.fromEntries(
    NOTIFICATION_POSITIONS.map((position) => [position, [] as NotificationItem[]]),
  ) as Record<NotificationPosition, NotificationItem[]>;

  for (const item of notifications.value) {
    // Newest first: anchors render index 0 nearest the viewport edge.
    grouped[item.position].unshift(item);
  }

  return grouped;
});

const activeCount = computed(
  () => notifications.value.filter((item) => !item.isDismissing).length,
);

/* -------------------------------------------------------------------------- */
/* API                                                                         */
/* -------------------------------------------------------------------------- */

const api: NotifyApi = {
  notifications,
  notify: notifyFn,
  createNotification: buildNotification,
  updateNotification,
  dismiss,
  dismissAll,
  dismissPosition,
  pause,
  resume,
  pauseAll,
  resumeAll,
  byPosition,
  activeCount,
  isMuted: sound.isMuted,
  setMuted: (value: boolean) => sound.setMuted(value),
  toggleMuted: () => sound.toggleMuted(),
  dispose(): void {
    if (consumers === 0) {
      return;
    }

    consumers -= 1;

    if (consumers > 0) {
      return;
    }

    stopAllTickers();
    focusPausedIds.clear();
    detachListeners();
    storage.dispose();
    sound.dispose();
  },
};

/**
 * Accesses the shared notification store.
 *
 * Safe to call from component setup or plain modules. Global key/focus
 * listeners are armed on first use and released by the final `dispose()`.
 */
export function useNotify(): NotifyApi {
  consumers += 1;
  attachListeners();

  return api;
}

/** Convenience re-export so consumers can fire a notification without setup. */
export function notify(input: CreateNotificationInput): string {
  attachListeners();
  return push(input);
}

/** Convenience re-export of the promise bridge. */
export function notifyPromiseBridge<T>(
  executor: () => Promise<T>,
  messages: PromiseNotificationMessages<T>,
): Promise<T> {
  attachListeners();
  return notifyPromise(executor, messages);
}

/**
 * Re-entrancy registry for action handlers, keyed by notification id.
 *
 * A fast double-tap dispatches two activation events before the first async
 * handler settles: without this lock the handler runs twice, the notification
 * is dismissed twice, and the failure path can raise two error notifications
 * for a single user intent. The lock is per notification (not per action),
 * because a successful action dismisses the whole card — a second, different
 * action on the same card would race that dismissal. Released in `finally`, so
 * a rejected action always stays retryable.
 */
const inFlightActionIds = new Set<string>();

/** Executes a notification action, surfacing async failures in place. */
export async function runNotificationAction(
  item: NotificationItem,
  action: NotificationAction,
): Promise<void> {
  if (inFlightActionIds.has(item.id)) {
    return;
  }

  inFlightActionIds.add(item.id);

  try {
    await action.run(item.id);
    dismiss(item.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    updateNotification(item.id, {
      type: 'error',
      title: 'Action failed',
      description: message,
      duration: DEFAULT_DURATION,
      dismissible: true,
      showProgress: true,
      remainingTime: DEFAULT_DURATION,
      timerStartedAt: monotonicNow(),
    });
  } finally {
    inFlightActionIds.delete(item.id);
  }
}
