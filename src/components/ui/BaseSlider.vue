<template>
  <div class="flex w-full flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="sliderId" class="text-sm font-medium text-slate-700 dark:text-slate-200">
        {{ label }}
      </label>
      <output :for="sliderId" class="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
        {{ displayValue }}
      </output>
    </div>

    <input
      :id="sliderId"
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :name="name"
      :aria-valuetext="displayValue"
      :aria-describedby="hint ? hintId : undefined"
      :class="sliderClasses"
    />

    <div class="flex items-center justify-between text-[11px] muted-text">
      <span>{{ formatValue(min) }}</span>
      <span v-if="hint" :id="hintId">{{ hint }}</span>
      <span>{{ formatValue(max) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Visible control label. */
    label: string;
    /** Lowest selectable value. */
    min?: number;
    /** Highest selectable value. */
    max?: number;
    /** Increment between selectable values. */
    step?: number;
    /** Helper text shown between the range bounds. */
    hint?: string;
    /** Native form field name. */
    name?: string;
    /** Disables the control. */
    disabled?: boolean;
    /** Suffix appended to the numeric readout, e.g. `ms`. */
    unit?: string;
    /** Custom formatter for bounds and readout; overrides `unit`. */
    format?: (value: number) => string;
  }>(),
  {
    min: 0,
    max: 15_000,
    step: 100,
    hint: undefined,
    name: undefined,
    disabled: false,
    unit: '',
    format: undefined,
  },
);

/** Two-way bound numeric value via Vue 3.5 `defineModel()`. */
const model = defineModel<number>({ default: 0 });

const uid = useId();
const sliderId = `base-slider-${uid}`;
const hintId = `${sliderId}-hint`;

function formatValue(value: number): string {
  if (props.format) {
    return props.format(value);
  }

  return props.unit ? `${value}${props.unit}` : String(value);
}

const displayValue = computed(() => formatValue(model.value));

const sliderClasses = computed(() => [
  'h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent',
  'accent-brand-600 dark:accent-brand-400',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
]);
</script>
