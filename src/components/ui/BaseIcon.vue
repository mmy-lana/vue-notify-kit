<template>
  <!--
    `v-html` is safe by construction: the markup only ever comes from the
    compile-time constant registry in `icon-registry.ts`. No prop, slot, storage
    payload, or user input is ever rendered as HTML.
  -->
  <svg
    :width="resolvedSize"
    :height="resolvedSize"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
    :class="spinning ? 'animate-spin' : undefined"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    v-html="markup"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { getIconMarkup, type IconName } from './icon-registry';

const props = withDefaults(
  defineProps<{
    /** Registry key of the glyph to render. */
    name: IconName;
    /** Rendered box size: a pixel number or any CSS length string. */
    size?: number | string;
    /** Stroke thickness in viewBox units. */
    strokeWidth?: number;
    /** Accessible name. Omit for decorative icons sitting next to visible text. */
    label?: string;
    /** Forces rotation on/off; defaults to spinning only for `Loader`. */
    spin?: boolean;
  }>(),
  {
    size: 20,
    strokeWidth: 1.75,
    label: undefined,
    spin: undefined,
  },
);

const markup = computed(() => getIconMarkup(props.name));

const resolvedSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
);

const spinning = computed(() => props.spin ?? props.name === 'Loader');
</script>
