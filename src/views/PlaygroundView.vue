<template>
  <div class="flex flex-col gap-5">
    <header id="workbench" class="scroll-mt-20">
      <div class="flex flex-wrap items-center gap-2">
        <BaseBadge variant="brand" size="sm">Playground</BaseBadge>
        <BaseBadge variant="neutral" size="sm">{{ activeCount }} active</BaseBadge>
        <BaseBadge :variant="isMuted ? 'warning' : 'success'" size="sm">
          {{ isMuted ? 'sound muted' : 'sound on' }}
        </BaseBadge>
      </div>

      <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
        Interactive notification workbench
      </h1>
      <p class="mt-1.5 max-w-3xl text-sm muted-text">
        Configure a notification, fire it against the real store, and inspect the exact payload and
        generated code. Every control writes straight to the persisted playground configuration, so
        your setup survives a refresh and syncs across tabs.
      </p>
    </header>

    <section id="configurator" class="scroll-mt-20">
      <PlaygroundWorkbench @open-history="historyDrawer.open()" />
    </section>

    <section id="responsive-notes" class="scroll-mt-20 surface-card p-4">
      <h2 class="section-title">Responsive behaviour</h2>
      <p class="mt-1 text-sm muted-text">
        Resize the window and watch the viewport adapt: anchors collapse to a centered position
        below 768px, gutters shrink on phones, and swipe-to-dismiss stays available on every touch
        breakpoint.
      </p>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        <li
          v-for="band in BREAKPOINT_MATRIX"
          :key="band.id"
          class="surface-subtle flex flex-col gap-1 p-3 text-xs"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ band.label }}</span>
            <span class="font-mono muted-text">{{ band.range }}</span>
          </span>
          <span class="muted-text">{{ band.toasts }}</span>
          <span class="muted-text">{{ band.interaction }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import PlaygroundWorkbench from '@/components/organisms/PlaygroundWorkbench.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import { BREAKPOINT_MATRIX } from '@/content/navigation';
import { useHistoryDrawer } from '@/composables/useHistoryDrawer';
import { useNotify } from '@/composables/useNotify';

const { activeCount, isMuted } = useNotify();
const historyDrawer = useHistoryDrawer();
</script>
