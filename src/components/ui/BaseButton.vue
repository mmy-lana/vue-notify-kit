<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
    :class="[baseClasses, variantClasses, sizeClasses, block ? 'w-full' : '', square ? 'px-0' : '']"
    @click="handleClick"
  >
    <BaseIcon v-if="loading" name="Loader" :size="iconSize" class="shrink-0" />
    <span v-if="loading" class="sr-only">{{ loadingLabel }}</span>

    <slot name="leading" />

    <span v-if="$slots.default" class="truncate"><slot /></span>

    <slot name="trailing" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import BaseIcon from './BaseIcon.vue';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    /** Semantic color treatment. */
    variant?: ButtonVariant;
    /** Density of the control; every size still honours the 44px touch floor. */
    size?: ButtonSize;
    /** Native button type. */
    type?: 'button' | 'submit' | 'reset';
    /** Disables interaction. */
    disabled?: boolean;
    /** Shows a spinner and blocks activation (async action feedback). */
    loading?: boolean;
    /** Stretches the button to the container width. */
    block?: boolean;
    /** Renders a square icon-only button; always pair with `ariaLabel`. */
    square?: boolean;
    /** Accessible name; required for icon-only usage. */
    ariaLabel?: string;
    /** Screen-reader text announced while `loading` is true. */
    loadingLabel?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    square: false,
    ariaLabel: undefined,
    loadingLabel: 'Loading',
  },
);

const emit = defineEmits<{
  /** Emitted only when the button is actionable. */
  click: [event: MouseEvent];
}>();

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-500 active:bg-brand-700 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400',
  secondary:
    'bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline:
    'border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-200/70 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/70',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800/70',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700 dark:bg-red-500 dark:text-slate-950 dark:hover:bg-red-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'gap-1.5 px-2.5 py-1 text-xs',
  sm: 'gap-2 px-3 py-1.5 text-sm',
  md: 'gap-2 px-4 py-2 text-sm',
  lg: 'gap-2.5 px-5 py-2.5 text-base',
};

const ICON_SIZES: Record<ButtonSize, number> = { xs: 14, sm: 16, md: 18, lg: 20 };

const isDisabled = computed(() => props.disabled || props.loading);
const iconSize = computed(() => ICON_SIZES[props.size]);
const sizeClasses = computed(() => SIZE_CLASSES[props.size]);
const variantClasses = computed(() => VARIANT_CLASSES[props.variant]);

/**
 * Every size keeps a hard 44×44px tap floor, and keyboard focus rings are never
 * suppressed.
 */
const baseClasses =
  'tap-target inline-flex cursor-pointer items-center justify-center rounded-control font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50';

function handleClick(event: MouseEvent): void {
  if (isDisabled.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit('click', event);
}
</script>
