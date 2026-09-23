<template>
  <div class="flex items-start justify-between gap-3 py-1">
    <div class="min-w-0 flex-1">
      <span
        :id="labelId"
        class="block cursor-pointer text-sm font-medium text-slate-700 select-none dark:text-slate-200"
        @click="toggle"
      >
        {{ label }}
      </span>
      <span v-if="description" :id="descriptionId" class="mt-0.5 block text-xs muted-text">
        {{ description }}
      </span>
    </div>

    <button
      :id="switchId"
      type="button"
      role="switch"
      :aria-checked="model ? 'true' : 'false'"
      :aria-labelledby="labelId"
      :aria-describedby="description ? descriptionId : undefined"
      :disabled="disabled"
      :class="[trackClasses, model ? onClasses : offClasses]"
      @click="toggle"
    >
      <span :class="[knobClasses, model ? 'translate-x-5' : 'translate-x-0']" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Visible control label; also serves as the accessible name. */
    label: string;
    /** Optional supporting copy announced as the description. */
    description?: string;
    /** Prevents toggling. */
    disabled?: boolean;
  }>(),
  {
    description: undefined,
    disabled: false,
  },
);

/** Two-way bound boolean via Vue 3.5 `defineModel()`. */
const model = defineModel<boolean>({ default: false });

const uid = useId();
const switchId = `base-switch-${uid}`;
const labelId = `${switchId}-label`;
const descriptionId = `${switchId}-description`;

const trackClasses =
  'tap-target relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center self-center rounded-full border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50';

const onClasses = 'bg-brand-600 dark:bg-brand-500';
const offClasses = 'bg-slate-300 dark:bg-slate-700';

const knobClasses = computed(
  () =>
    `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform dark:bg-slate-950 ${
      props.disabled ? 'opacity-80' : ''
    }`,
);

function toggle(): void {
  if (props.disabled) {
    return;
  }

  model.value = !model.value;
}
</script>
