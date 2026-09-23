<template>
  <div class="flex w-full flex-col gap-1.5">
    <label
      v-if="label"
      :for="inputId"
      class="text-sm font-medium text-slate-700 dark:text-slate-200"
    >
      {{ label }}
      <span v-if="required" class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <span
        v-if="$slots.prefix"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500"
      >
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        v-model="model"
        :type="type"
        :name="name"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        :class="[controlClasses, $slots.prefix ? 'pl-10' : '', $slots.suffix ? 'pr-10' : '']"
        @blur="emit('blur')"
        @keydown.enter="emit('submit')"
      />

      <span
        v-if="$slots.suffix"
        class="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 dark:text-slate-500"
      >
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="error" :id="errorId" class="text-xs font-medium text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="text-xs muted-text">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Visible field label; bound to the input through `for`/`id`. */
    label?: string;
    /** Placeholder shown while the field is empty. */
    placeholder?: string;
    /** Native input type. */
    type?: 'text' | 'search' | 'url' | 'email' | 'tel' | 'password';
    /** Helper text, rendered whenever there is no error. */
    hint?: string;
    /** Validation message; switches the field into its error state. */
    error?: string;
    /** Native form field name. */
    name?: string;
    /** Disables the control. */
    disabled?: boolean;
    /** Read-only but still focusable and copyable. */
    readonly?: boolean;
    /** Marks the field required in the DOM. */
    required?: boolean;
    /** Maximum accepted character count. */
    maxlength?: number;
    /** Autocomplete hint for password managers. */
    autocomplete?: string;
    /** Virtual-keyboard hint for mobile devices. */
    inputmode?: 'text' | 'search' | 'url' | 'email' | 'numeric' | 'decimal';
  }>(),
  {
    label: undefined,
    placeholder: undefined,
    type: 'text',
    hint: undefined,
    error: undefined,
    name: undefined,
    disabled: false,
    readonly: false,
    required: false,
    maxlength: undefined,
    autocomplete: undefined,
    inputmode: undefined,
  },
);

/** Two-way bound value via Vue 3.5 `defineModel()`. */
const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  /** Fired when the field loses focus (validation trigger). */
  blur: [];
  /** Fired on Enter for search-style fields. */
  submit: [];
}>();

const uid = useId();
const inputId = `base-input-${uid}`;
const errorId = `${inputId}-error`;
const hintId = `${inputId}-hint`;

const describedBy = computed(() => {
  if (props.error) {
    return errorId;
  }

  return props.hint ? hintId : undefined;
});

const controlClasses = computed(() => [
  'block w-full min-h-[44px] rounded-control border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors',
  'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60',
  'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
  props.error ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700',
]);
</script>
