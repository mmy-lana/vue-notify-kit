<template>
  <nav
    :class="[
      'flex h-full flex-col',
      variant === 'drawer' ? 'w-full p-3' : collapsed ? 'w-[72px] p-2' : 'w-[280px] p-3',
    ]"
    :aria-label="variant === 'drawer' ? 'Documentation navigation' : 'Documentation sidebar'"
  >
    <div v-if="variant === 'drawer'" class="mb-3 flex items-center justify-between gap-2">
      <span class="section-title">Navigate</span>
      <BaseButton
        variant="ghost"
        size="sm"
        square
        aria-label="Close navigation menu"
        @click="emit('navigate')"
      >
        <BaseIcon name="X" :size="18" />
      </BaseButton>
    </div>

    <div class="scroll-area min-h-0 flex-1 overflow-y-auto">
      <section v-for="section in DOC_NAVIGATION" :key="section.id" class="mb-4 last:mb-0">
        <h2
          v-if="!collapsed"
          class="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
        >
          {{ section.title }}
        </h2>
        <span v-else class="sr-only">{{ section.title }}</span>

        <ul class="flex flex-col gap-0.5">
          <li v-for="item in section.items" :key="item.id">
            <RouterLink
              :to="item.path"
              :title="collapsed ? item.title : undefined"
              :aria-label="collapsed ? `${item.title} — ${section.title}` : undefined"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              :class="[
                'flex min-h-[44px] items-center gap-2.5 rounded-control px-2 py-2 text-sm transition-colors',
                collapsed ? 'justify-center' : '',
                isActive(item.path)
                  ? 'bg-brand-100 font-semibold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50',
              ]"
              @click="emit('navigate')"
            >
              <BaseIcon :name="SECTION_ICONS[section.id] ?? 'ChevronRight'" :size="16" class="shrink-0" />

              <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.title }}</span>

              <BaseBadge v-if="item.badge && !collapsed" variant="neutral" size="sm">
                {{ item.badge }}
              </BaseBadge>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="!collapsed" class="mt-3 rounded-control border border-slate-200 p-3 dark:border-slate-800">
      <p class="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Keyboard
      </p>
      <ul class="mt-1.5 flex flex-col gap-1 text-xs muted-text">
        <li v-for="shortcut in SHORTCUTS" :key="shortcut.action" class="flex items-center justify-between gap-2">
          <span>{{ shortcut.action }}</span>
          <kbd
            class="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700"
          >
            {{ shortcut.keys }}
          </kbd>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import type { IconName } from '@/components/ui/icon-registry';
import { DOC_NAVIGATION } from '@/content/navigation';

withDefaults(
  defineProps<{
    /** Renders icon-only navigation (tablet sidebar). */
    collapsed?: boolean;
    /** `drawer` renders the mobile full-screen menu chrome. */
    variant?: 'static' | 'drawer';
  }>(),
  {
    collapsed: false,
    variant: 'static',
  },
);

const emit = defineEmits<{
  /** Fired after a link activation, so the mobile drawer can close itself. */
  navigate: [];
}>();

const route = useRoute();

const SECTION_ICONS: Record<string, IconName> = {
  start: 'Zap',
  guides: 'Layers',
  reference: 'Terminal',
  interactive: 'Play',
};

const SHORTCUTS = [
  { action: 'Focus search', keys: '/' },
  { action: 'Dismiss newest toast', keys: 'Esc' },
  { action: 'Swipe a toast away', keys: '← →' },
] as const;

/**
 * A link is active when both its pathname and (if present) its hash match the
 * current route, which keeps deep anchors distinguishable inside one page.
 */
function isActive(path: string): boolean {
  const [pathname, hash] = path.split('#');

  if (route.path !== pathname) {
    return false;
  }

  if (hash === undefined) {
    return true;
  }

  return route.hash === `#${hash}`;
}
</script>
