<template>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden rounded-b-card"
    aria-hidden="true"
  >
    <div :class="['h-full origin-left will-change-transform', accentClasses, pausedClasses]" :style="barStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { NotificationItem, NotificationType } from '@/types/notify';

const props = defineProps<{
  /** Milliseconds left before auto-dismissal. */
  remainingTime: number;
  /** Total lifetime in milliseconds; `0` means persistent. */
  duration: number;
  /** Whether the countdown is currently frozen. */
  isPaused: boolean;
  /** Notification type, used for the accent color. */
  type: NotificationType;
  /** Convenience passthrough so callers can forward a whole item. */
  item?: NotificationItem;
}>();

const ACCENT_CLASSES: Record<NotificationType, string> = {
  info: 'bg-notify-info',
  success: 'bg-notify-success',
  warning: 'bg-notify-warning',
  error: 'bg-notify-error',
  loading: 'bg-notify-loading',
  default: 'bg-notify-neutral',
};

const accentClasses = computed(() => ACCENT_CLASSES[props.type]);

const pausedClasses = computed(() =>
  props.isPaused ? 'opacity-40 transition-opacity duration-200' : 'opacity-100',
);

/**
 * Progress is expressed as a GPU-accelerated `scaleX` transform rather than an
 * animated `width`, so per-frame countdown updates never trigger layout.
 */
const progress = computed(() => {
  if (props.duration <= 0) {
    return 0;
  }

  const ratio = props.remainingTime / props.duration;
  return Math.min(1, Math.max(0, ratio));
});

const barStyle = computed(() => ({
  transform: `scaleX(${progress.value})`,
}));
</script>
