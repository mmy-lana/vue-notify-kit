<template>
  <div class="flex w-full flex-col gap-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

    <div class="relative">
      <select
        :id="selectId"
        v-model="model"
        :name="name"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        :class="controlClasses"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <BaseIcon
        name="ChevronDown"
        :size="16"
        class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 dark:text-slate-500"
      />
    </div>

    <p v-if="error" :id="errorId" class="text-xs font-medium text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="text-xs muted-text">{{ hint }}</p>
  </div>
</template>

<!--
  Generic over the option value type so `v-model` can bind straight to narrowed
  unions such as `NotificationPosition` without widening to `string`.
-->
<script setup lang="ts" generic="T extends string">
import { computed, useId } from 'vue';

import BaseIcon from './BaseIcon.vue';

interface SelectOption {
  /** Value written to the bound model. */
  value: T;
  /** Human-readable option label. */
  label: string;
  /** Renders the option as unselectable. */
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** Visible field label. */
    label?: string;
    /** Selectable options. */
    options: ReadonlyArray<SelectOption>;
    /** Helper text rendered when there is no error. */
    hint?: string;
    /** Validation message; switches the field into its error state. */
    error?: string;
    /** Optional leading empty option. */
    placeholder?: string;
    /** Native form field name. */
    name?: string;
    /** Disables the control. */
    disabled?: boolean;
  }>(),
  {
    label: undefined,
    hint: undefined,
    error: undefined,
    placeholder: undefined,
    name: undefined,
    disabled: false,
  },
);

/** Two-way bound value via Vue 3.5 `defineModel()`. */
const model = defineModel<T>({ required: true });

const uid = useId();
const selectId = `base-select-${uid}`;
const errorId = `${selectId}-error`;
const hintId = `${selectId}-hint`;

const describedBy = computed(() => {
  if (props.error) {
    return errorId;
  }

  return props.hint ? hintId : undefined;
});

const controlClasses = computed(() => [
  'block w-full min-h-[44px] cursor-pointer appearance-none rounded-control border bg-white px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'dark:bg-slate-900 dark:text-slate-100',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
  props.error ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700',
]);
</script>
