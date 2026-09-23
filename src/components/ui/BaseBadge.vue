<template>
  <span :class="[baseClasses, variantClasses, sizeClasses]">
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full', dotClasses]" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { NotificationType } from '@/types/notify';

type BadgeVariant = NotificationType | 'neutral' | 'brand';
type BadgeSize = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    /** Semantic color family; notification types map 1:1. */
    variant?: BadgeVariant;
    /** Density of the pill. */
    size?: BadgeSize;
    /** Renders a leading status dot in the accent color. */
    dot?: boolean;
  }>(),
  {
    variant: 'neutral',
    size: 'md',
    dot: false,
  },
);

interface VariantStyle {
  /** Pill chrome: background, border, text color. */
  pill: string;
  /** Solid accent used by the leading dot. */
  dot: string;
}

const VARIANT_STYLES: Record<BadgeVariant, VariantStyle> = {
  info: {
    pill: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    dot: 'bg-sky-600 dark:bg-sky-400',
  },
  success: {
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  warning: {
    pill: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    dot: 'bg-amber-600 dark:bg-amber-400',
  },
  error: {
    pill: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
    dot: 'bg-red-600 dark:bg-red-400',
  },
  loading: {
    pill: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
    dot: 'bg-violet-600 dark:bg-violet-400',
  },
  default: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    dot: 'bg-slate-600 dark:bg-slate-400',
  },
  neutral: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
  brand: {
    pill: 'bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30',
    dot: 'bg-brand-600 dark:bg-brand-400',
  },
};

const baseClasses =
  'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap';

const sizeClasses = computed(() =>
  props.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
);

const variantClasses = computed(() => VARIANT_STYLES[props.variant].pill);
const dotClasses = computed(() => VARIANT_STYLES[props.variant].dot);
</script>
