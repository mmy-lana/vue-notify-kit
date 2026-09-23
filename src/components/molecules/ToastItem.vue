<template>
  <div
    ref="rootRef"
    :class="[
      cardClasses,
      swipe.swipeClass.value,
      // Mutually exclusive with the `pointer-events-none` that `cardClasses`
      // adds while dismissing. Both utilities have the same specificity, so a
      // conflict would be decided by Tailwind's internal emission order — which
      // this project cannot pin, because it depends on `tailwindcss: latest`.
      isInteractive && !item.isDismissing ? 'pointer-events-auto' : '',
    ]"
    :style="swipe.swipeStyle.value"
    :role="isUrgent ? 'alert' : 'status'"
    :aria-live="isUrgent ? 'assertive' : 'polite'"
    :aria-atomic="true"
    :tabindex="item.isDismissing ? -1 : 0"
    :data-notification-id="item.id"
    :data-paused="item.isPaused ? 'true' : 'false'"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    @touchstart.passive="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    @keydown.escape.stop="handleEscape"
  >
    <div class="flex items-start gap-3">
      <BaseIcon
        :name="iconName"
        :size="20"
        :class="['mt-0.5 shrink-0', accentClasses]"
      />

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-semibold break-words text-slate-900 dark:text-slate-50">
            {{ item.title }}
          </p>
          <BaseBadge v-if="item.isPaused && isCountdownActive" variant="neutral" size="sm">
            Paused
          </BaseBadge>
          <BaseBadge v-if="item.type === 'loading'" variant="loading" size="sm">Working</BaseBadge>
        </div>

        <p
          v-if="item.description"
          class="mt-1 text-sm break-words text-slate-600 dark:text-slate-300"
        >
          {{ item.description }}
        </p>

        <!--
          Action rows keep a mandatory 8px gap: adjacent targets can never
          collide, and each button still carries its own 44px hitbox.
        -->
        <div v-if="item.actions.length > 0" class="mt-3 flex flex-wrap items-center gap-2">
          <BaseButton
            v-for="action in item.actions"
            :key="action.id"
            :variant="ACTION_VARIANT_MAP[action.variant]"
            size="sm"
            :disabled="inFlightActionIds.length > 0"
            :loading="isActionInFlight(action.id)"
            loading-label="Running action"
            :aria-label="action.ariaLabel ?? action.label"
            @click="handleActionClick(action)"
          >
            {{ action.label }}
          </BaseButton>
        </div>
      </div>

      <BaseButton
        v-if="item.dismissible"
        variant="ghost"
        size="sm"
        square
        :aria-label="`Dismiss notification: ${item.title}`"
        @click="emit('dismiss')"
      >
        <BaseIcon name="X" :size="16" />
      </BaseButton>
    </div>

    <ToastProgressBar
      v-if="item.showProgress && isCountdownActive"
      :remaining-time="item.remainingTime"
      :duration="item.duration"
      :is-paused="item.isPaused"
      :type="item.type"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import type { IconName } from '@/components/ui/icon-registry';
import { runNotificationAction } from '@/composables/useNotify';
import { useSwipeDismiss } from '@/composables/useSwipeDismiss';
import type { NotificationAction, NotificationItem, NotificationType } from '@/types/notify';

import ToastProgressBar from './ToastProgressBar.vue';

const props = withDefaults(
  defineProps<{
    /** The notification to render (complete, factory-built item). */
    item: NotificationItem;
    /** Enables pointer interaction (false for cards buried in a stack). */
    isInteractive?: boolean;
  }>(),
  {
    isInteractive: true,
  },
);

const emit = defineEmits<{
  /**
   * Requests removal through the store dismissal protocol.
   *
   * `immediate` is set by the swipe gesture, which has already animated the
   * card off-screen and therefore must not wait out the store's fade window a
   * second time. Button and keyboard dismissal leave it unset so the card keeps
   * its exit transition.
   */
  dismiss: [immediate?: boolean];
  /** Freezes the countdown (hover, focus, or touch hold). */
  pause: [];
  /** Restarts the countdown after a pause. */
  resume: [];
  /**
   * Observational: emitted once per accepted activation. Execution itself is
   * owned by this component so the button can be locked while the handler is
   * pending; the store-level guard in `runNotificationAction` is the
   * authoritative backstop against concurrent re-entry.
   */
  action: [action: NotificationAction];
}>();

const ICON_MAP: Record<NotificationType, IconName> = {
  info: 'Info',
  success: 'CheckCircle',
  warning: 'AlertTriangle',
  error: 'AlertOctagon',
  loading: 'Loader',
  default: 'Bell',
};

const ACTION_VARIANT_MAP: Record<
  NotificationAction['variant'],
  'primary' | 'secondary' | 'danger' | 'ghost'
> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  ghost: 'ghost',
};

const ACCENT_CLASSES: Record<NotificationType, string> = {
  info: 'text-notify-info',
  success: 'text-notify-success',
  warning: 'text-notify-warning',
  error: 'text-notify-error',
  loading: 'text-notify-loading',
  default: 'text-notify-neutral',
};

const BORDER_CLASSES: Record<NotificationType, string> = {
  info: 'border-l-notify-info',
  success: 'border-l-notify-success',
  warning: 'border-l-notify-warning',
  error: 'border-l-notify-error',
  loading: 'border-l-notify-loading',
  default: 'border-l-notify-neutral',
};

const iconName = computed(() => ICON_MAP[props.item.type]);
const accentClasses = computed(() => ACCENT_CLASSES[props.item.type]);

/** Errors and warnings interrupt; everything else waits its turn. */
const isUrgent = computed(() => props.item.type === 'error' || props.item.type === 'warning');

/** Persistent (duration 0) and loading toasts have no countdown to visualize. */
const isCountdownActive = computed(() => props.item.duration > 0);

const cardClasses = computed(() => [
  'relative w-full overflow-hidden rounded-card border border-l-4 border-slate-200 bg-white p-3.5 pr-3 shadow-lg transition-shadow',
  'dark:border-slate-800 dark:border-l-4 dark:bg-slate-900',
  BORDER_CLASSES[props.item.type],
  // A dismissing card fades over DISMISS_EXIT_DURATION but stays mounted, so
  // without this it keeps live 44px hit targets and an already-dismissed action
  // can still be activated by a click aimed at where it used to be.
  props.item.isDismissing ? 'pointer-events-none opacity-0' : '',
  props.item.customClass ?? '',
]);

/**
 * Template ref for the card root element. This exact ref object is handed to
 * the gesture engine: the engine binds `touchmove` imperatively with
 * `{ passive: false }` in `onMounted`, so it needs the ref the template
 * actually populates. Without the linkage the listener is never attached and
 * the swipe gesture cannot cancel vertical scroll.
 */
const rootRef = ref<HTMLElement | null>(null);

const swipe = useSwipeDismiss({
  element: rootRef,
  enabled: () => props.item.dismissible && !props.item.isDismissing,
  // The gesture already parked the card off-screen during its own exit
  // animation, so the store must splice it immediately rather than fade an
  // invisible card for a further DISMISS_EXIT_DURATION.
  onDismiss: () => emit('dismiss', true),
});

/**
 * Re-entrancy lock for the action row: ids of actions whose handler has been
 * invoked and has not settled yet.
 *
 * Touch hardware delivers two `click` events for a fast double-tap, and an
 * async handler (network round-trip, confirmation dialog) stays pending long
 * enough for both dispatches to land before the first one settles. While any
 * action is in flight every action button on the card is disabled, and the
 * activated one renders a spinner, so a second invocation cannot be started.
 */
const inFlightActionIds = ref<string[]>([]);

function isActionInFlight(actionId: string): boolean {
  return inFlightActionIds.value.includes(actionId);
}

/**
 * Runs the action through the store, which owns dismissal and failure
 * surfacing, then releases the lock when the handler settles. The lock is
 * released in `finally` so a failed action stays retryable.
 */
async function handleActionClick(action: NotificationAction): Promise<void> {
  if (inFlightActionIds.value.length > 0) {
    return;
  }

  inFlightActionIds.value = [...inFlightActionIds.value, action.id];
  emit('action', action);

  try {
    await runNotificationAction(props.item, action);
  } finally {
    inFlightActionIds.value = inFlightActionIds.value.filter((id) => id !== action.id);
  }
}

function handlePointerEnter(): void {
  if (props.item.pauseOnHover) {
    emit('pause');
  }
}

function handlePointerLeave(): void {
  if (props.item.pauseOnHover) {
    emit('resume');
  }
}

function handleFocusIn(): void {
  emit('pause');
}

function handleFocusOut(): void {
  emit('resume');
}

function handleTouchStart(event: TouchEvent): void {
  swipe.onTouchStart(event);
  emit('pause');
}

function handleTouchEnd(event: TouchEvent): void {
  swipe.onTouchEnd(event);
  emit('resume');
}

function handleTouchCancel(event: TouchEvent): void {
  swipe.onTouchCancel(event);
  emit('resume');
}

/** Escape dismisses only when the notification actually allows dismissal. */
function handleEscape(): void {
  if (props.item.dismissible) {
    emit('dismiss');
  }
}
</script>
