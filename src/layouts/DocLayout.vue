<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main-content"
      class="sr-only rounded-control bg-brand-600 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-drawer-panel"
    >
      Skip to content
    </a>

    <DocHeader
      :navigation-open="navigationOpen"
      :sidebar-collapsed="sidebarCollapsed"
      @toggle-navigation="navigationOpen = !navigationOpen"
      @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      @open-history="historyDrawer.open()"
    />

    <!-- Mobile navigation drawer --------------------------------------- -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
      >
        <div
          v-if="navigationOpen"
          class="fixed inset-0 z-drawer-nav bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          @click="navigationOpen = false"
        />
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="-translate-x-full"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-to-class="-translate-x-full"
      >
        <aside
          v-if="navigationOpen"
          id="doc-sidebar-drawer"
          class="fixed inset-y-0 left-0 z-drawer-nav w-[86vw] max-w-[320px] overflow-hidden border-r border-slate-200 bg-white shadow-2xl md:hidden dark:border-slate-800 dark:bg-slate-900"
          @keydown.escape.stop="navigationOpen = false"
        >
          <DocSidebar variant="drawer" @navigate="navigationOpen = false" />
        </aside>
      </Transition>
    </Teleport>

    <div class="mx-auto flex w-full max-w-[1600px] flex-1 items-start gap-6 px-3 sm:px-4 lg:px-6">
      <!-- Tablet + desktop sidebar ------------------------------------- -->
      <aside
        class="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] shrink-0 overflow-hidden md:block"
        :class="effectiveSidebarCollapsed ? 'w-[72px]' : 'w-[280px]'"
      >
        <DocSidebar :collapsed="effectiveSidebarCollapsed" />
      </aside>

      <!-- Content ------------------------------------------------------ -->
      <main id="main-content" class="min-w-0 flex-1 py-5 pb-28 md:pb-8">
        <!--
          Supply-chain guard. This repository is `private` in package.json and no
          `vue-notify-kit` artifact exists on any registry, so a reader who copies
          an install command from these pages is one typo away from a
          typosquatted dependency. The notice is rendered by the shared layout, so
          it appears on both the playground and the documentation views.

          Layering: `z-[8700]` sits above the sticky header (8500) and the mobile
          quick-launch toolbar (8600), but below both drawers (9000/9100) and the
          toast viewport (9999), so it can never cover a notification or a dialog.

          `role="alert"` is deliberate rather than incidental: this is a security
          warning, and an assertive announcement is the intended behaviour. The
          element is not re-created on navigation (the layout persists across
          routes), so it does not re-announce on every route change.
        -->
        <aside
          role="alert"
          aria-label="Demo notice"
          data-testid="demo-notice"
          class="sticky top-16 z-[8700] mb-6 flex flex-col items-start justify-between gap-3 rounded-card border-2 border-amber-500/80 bg-amber-500/10 p-3.5 shadow-lg backdrop-blur-md sm:flex-row sm:items-center dark:border-amber-400/60 dark:bg-amber-950/80"
        >
          <div class="flex items-start gap-2.5">
            <BaseIcon
              name="AlertTriangle"
              :size="20"
              class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div class="min-w-0 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
              <strong class="font-bold tracking-wider text-amber-900 uppercase dark:text-amber-300">
                [DEMO ONLY - NOT AN NPM PACKAGE]
              </strong>
              <p class="mt-0.5 break-words">
                This website is an interactive component sandbox and in-repo service architecture. Do
                NOT attempt to run
                <code
                  class="rounded bg-amber-200/80 px-1 py-0.5 font-mono text-[11px] font-semibold break-all text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                >npm install vue-notify-kit</code>. Copy the source files directly into your project
                repository.
              </p>
            </div>
          </div>
          <RouterLink
            to="/docs#installation"
            class="tap-target inline-flex shrink-0 items-center justify-center rounded-control bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            Integration Guide
          </RouterLink>
        </aside>

        <slot />
      </main>

      <!-- Table of contents ------------------------------------------- -->
      <aside
        v-if="toc.length > 0"
        class="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-[200px] shrink-0 overflow-y-auto py-6 lg:block xl:w-[220px]"
        aria-label="On this page"
      >
        <p class="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          On this page
        </p>
        <ul class="flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800">
          <li v-for="entry in toc" :key="entry.id">
            <a
              :href="`#${entry.id}`"
              class="block min-h-[36px] border-l-2 border-transparent py-1.5 pl-3 text-sm text-slate-600 transition-colors hover:border-brand-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {{ entry.label }}
            </a>
          </li>
        </ul>
      </aside>
    </div>

    <!-- Floating quick-launch bar (mobile) ---------------------------- -->
    <div
      class="fixed right-3 bottom-3 z-[8600] flex flex-col gap-2 md:hidden"
      role="toolbar"
      aria-label="Quick actions"
    >
      <BaseButton
        v-for="action in QUICK_ACTIONS"
        :key="action.id"
        :variant="action.id === 'history' ? 'primary' : 'secondary'"
        size="sm"
        square
        class="shadow-lg"
        :aria-label="action.label"
        @click="action.run()"
      >
        <BaseIcon :name="action.icon" :size="20" />
      </BaseButton>
    </div>

    <!-- Global toast viewport ----------------------------------------- -->
    <ToastContainer :stacking-mode="playgroundConfig.stackingMode" />

    <NotificationHistoryDrawer :open="historyDrawer.isOpen.value" @close="historyDrawer.close()" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import NotificationHistoryDrawer from '@/components/organisms/NotificationHistoryDrawer.vue';
import DocHeader from '@/components/organisms/DocHeader.vue';
import DocSidebar from '@/components/organisms/DocSidebar.vue';
import ToastContainer from '@/components/organisms/ToastContainer.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import type { IconName } from '@/components/ui/icon-registry';
import { DOC_TOC, PLAYGROUND_TOC } from '@/content/navigation';
import { useHistoryDrawer } from '@/composables/useHistoryDrawer';
import { useNotify } from '@/composables/useNotify';
import { useNotifyStorage } from '@/composables/useNotifyStorage';
import { DESKTOP_BREAKPOINT_PX } from '@/utils/constants';

const route = useRoute();
const historyDrawer = useHistoryDrawer();
const { toggleMuted, isMuted } = useNotify();
const { playgroundConfig } = useNotifyStorage();

const navigationOpen = ref(false);
const sidebarCollapsed = ref(false);
const viewportWidth = ref(1280);

const isDesktop = computed(() => viewportWidth.value >= DESKTOP_BREAKPOINT_PX);
const effectiveSidebarCollapsed = computed(() => (isDesktop.value ? false : sidebarCollapsed.value));

/** The right-hand TOC follows the active route. */
const toc = computed(() => (route.path.startsWith('/docs') ? DOC_TOC : PLAYGROUND_TOC));

const QUICK_ACTIONS = computed<Array<{ id: string; label: string; icon: IconName; run: () => void }>>(
  () => [
    {
      id: 'history',
      label: 'Open notification history',
      icon: 'History',
      run: () => historyDrawer.open(),
    },
    {
      id: 'sound',
      label: isMuted.value ? 'Unmute notification sounds' : 'Mute notification sounds',
      icon: isMuted.value ? 'VolumeX' : 'Volume2',
      run: () => {
        toggleMuted();
      },
    },
    {
      id: 'top',
      label: 'Scroll back to the top of the page',
      icon: 'ArrowUp',
      run: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
  ],
);

function handleResize(): void {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

// Mobile drawers are mutually exclusive: opening one closes the other.
watch(
  () => historyDrawer.isOpen.value,
  (open) => {
    if (open) {
      navigationOpen.value = false;
    }
  },
);

watch(navigationOpen, (open) => {
  if (open && historyDrawer.isOpen.value) {
    historyDrawer.close();
  }
});

// Route changes always dismiss overlays: both the navigation drawer and the
// history sheet belong to the page you were looking at.
watch(
  () => route.fullPath,
  () => {
    navigationOpen.value = false;
    historyDrawer.close();
  },
);

/** Hash links scroll after the view has rendered. */
watch(
  () => route.hash,
  async (hash) => {
    if (hash.length === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.querySelector(hash);

    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },
);
</script>
