<template>
  <section class="surface-card overflow-hidden">
    <h3 class="m-0">
      <button
        type="button"
        :aria-expanded="isOpen"
        :aria-controls="panelId"
        class="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 dark:hover:bg-slate-800/50"
        @click="toggle"
      >
        <BaseIcon v-if="icon" :name="icon" :size="16" class="shrink-0 muted-text" />

        <span class="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {{ title }}
        </span>

        <BaseBadge v-if="badge" variant="neutral" size="sm">{{ badge }}</BaseBadge>

        <BaseIcon
          name="ChevronDown"
          :size="16"
          :class="['shrink-0 muted-text transition-transform duration-200', isOpen ? 'rotate-180' : '']"
        />
      </button>
    </h3>

    <!--
      Height animation via `grid-template-rows: 0fr → 1fr`; `inert` removes the
      collapsed subtree from the tab order so keyboard users cannot focus into
      hidden controls.
    -->
    <div :id="panelId" class="collapsible-grid" :data-collapsed="!isOpen">
      <div class="collapsible-inner">
        <div v-bind="contentProps" class="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <p v-if="description" class="mb-3 text-xs muted-text">{{ description }}</p>
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import type { IconName } from '@/components/ui/icon-registry';

const props = withDefaults(
  defineProps<{
    /** Section heading shown in the toggle. */
    title: string;
    /** Supporting copy rendered above the slot content. */
    description?: string;
    /** Optional leading icon from the registry. */
    icon?: IconName;
    /** Optional right-aligned count/status pill. */
    badge?: string;
    /** Initial expanded state. */
    defaultOpen?: boolean;
    /** Total control count, announced to assistive tech. */
    count?: number;
  }>(),
  {
    description: undefined,
    icon: undefined,
    badge: undefined,
    defaultOpen: true,
    count: undefined,
  },
);

const emit = defineEmits<{
  /** Fires after every expand/collapse transition. */
  toggle: [open: boolean];
}>();

const isOpen = ref(props.defaultOpen);
const uid = useId();
const panelId = `control-group-${uid}`;

/**
 * Collapsed content is `inert` (out of the tab order) and hidden from the
 * accessibility tree; expanded content carries no extra attributes.
 */
const contentProps = computed(() => {
  if (isOpen.value) {
    return {};
  }

  return { inert: true, 'aria-hidden': 'true' as const };
});

function toggle(): void {
  isOpen.value = !isOpen.value;
  emit('toggle', isOpen.value);
}
</script>
