/**
 * Canonical notification factory.
 *
 * Every notification that enters the store is assembled here, which guarantees
 * that a fully-populated `NotificationItem` (no nullable timer fields, clamped
 * duration, validated enums) exists before any UI or timer logic runs.
 */

import type {
  CreateNotificationInput,
  NotificationAction,
  NotificationFactory,
  NotificationItem,
} from '@/types/notify';
import {
  DEFAULT_DISMISSIBLE,
  DEFAULT_DURATION,
  DEFAULT_NOTIFICATION_TITLE,
  DEFAULT_PAUSE_ON_FOCUS_LOSS,
  DEFAULT_PAUSE_ON_HOVER,
  DEFAULT_POSITION,
  DEFAULT_SHOW_PROGRESS,
  DEFAULT_SOUND,
  DEFAULT_TRIGGER_SOURCE,
  DEFAULT_TYPE,
  MAX_DURATION,
  MIN_DURATION,
  isActionVariant,
  isNotificationPosition,
  isNotificationType,
  isPlainRecord,
  isTriggerSource,
} from './constants';
import { normalizeBoolean, normalizeText } from './coerce';
import { createId } from './id';
import { monotonicNow } from './time';

/**
 * Clamps an arbitrary duration into the supported `[MIN_DURATION, MAX_DURATION]`
 * window, falling back when the value is missing or not finite.
 */
export function clampDuration(value: unknown, fallback: number = DEFAULT_DURATION): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(numeric), MIN_DURATION), MAX_DURATION);
}

/**
 * Rebuilds the action list, dropping entries without a runnable handler or a
 * visible label and backfilling missing ids so `ToastItem` can always key them.
 */
function normalizeActions(raw: unknown): NotificationAction[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const actions: NotificationAction[] = [];

  raw.forEach((candidate: unknown, index: number) => {
    if (!isPlainRecord(candidate)) {
      return;
    }

    const run = candidate.run;
    if (typeof run !== 'function') {
      return;
    }

    const label = normalizeText(candidate.label);
    if (label === undefined) {
      return;
    }

    const action: NotificationAction = {
      id: normalizeText(candidate.id) ?? `action-${index}-${createId()}`,
      label,
      variant: isActionVariant(candidate.variant) ? candidate.variant : 'secondary',
      run: run as NotificationAction['run'],
    };

    const ariaLabel = normalizeText(candidate.ariaLabel);
    if (ariaLabel !== undefined) {
      action.ariaLabel = ariaLabel;
    }

    actions.push(action);
  });

  return actions;
}

/**
 * Canonical factory: validates caller input and returns a complete, timer-ready
 * notification item. Never throws — invalid fields degrade to documented
 * defaults, and `duration` is always clamped.
 *
 * @example
 * ```ts
 * const item = createNotification({ title: 'Saved', type: 'success' });
 * item.remainingTime; // 4000
 * item.timerStartedAt; // monotonic start stamp
 * ```
 */
export const createNotification = ((input: CreateNotificationInput): NotificationItem => {
  const duration = clampDuration(input.duration, DEFAULT_DURATION);

  return {
    id: createId(),
    type: isNotificationType(input.type) ? input.type : DEFAULT_TYPE,
    title: normalizeText(input.title) ?? DEFAULT_NOTIFICATION_TITLE,
    description: normalizeText(input.description),
    duration,
    position: isNotificationPosition(input.position) ? input.position : DEFAULT_POSITION,
    createdAt: Date.now(),
    dismissible: normalizeBoolean(input.dismissible, DEFAULT_DISMISSIBLE),
    showProgress: normalizeBoolean(input.showProgress, DEFAULT_SHOW_PROGRESS),
    pauseOnHover: normalizeBoolean(input.pauseOnHover, DEFAULT_PAUSE_ON_HOVER),
    pauseOnFocusLoss: normalizeBoolean(input.pauseOnFocusLoss, DEFAULT_PAUSE_ON_FOCUS_LOSS),
    sound: normalizeBoolean(input.sound, DEFAULT_SOUND),
    customClass: normalizeText(input.customClass),
    actions: normalizeActions(input.actions),
    remainingTime: duration,
    isPaused: false,
    timerStartedAt: monotonicNow(),
    triggerSource: isTriggerSource(input.triggerSource) ? input.triggerSource : DEFAULT_TRIGGER_SOURCE,
    isDismissing: false,
  };
}) satisfies NotificationFactory;
