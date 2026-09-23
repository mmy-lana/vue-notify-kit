<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-drawer-panel bg-slate-950/50 backdrop-blur-[2px]"
        @click="emit('close')"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
        tabindex="-1"
        class="fixed inset-y-0 right-0 z-drawer-panel flex w-full max-w-[26rem] flex-col border-l border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900"
        @keydown.escape.stop="emit('close')"
      >
        <header
          class="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          <div class="min-w-0">
            <h2
              id="history-drawer-title"
              class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50"
            >
              <BaseIcon name="History" :size="18" class="muted-text" />
              Notification history
              <BaseBadge variant="brand" size="sm">{{ history.length }}</BaseBadge>
            </h2>
            <p class="mt-1 text-xs muted-text">
              Newest first · capped at {{ historyLimit }} records · synced across tabs
            </p>
          </div>

          <BaseButton
            variant="ghost"
            size="sm"
            square
            aria-label="Close notification history"
            @click="emit('close')"
          >
            <BaseIcon name="X" :size="18" />
          </BaseButton>
        </header>

        <div
          class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800"
        >
          <BaseButton
            variant="outline"
            size="sm"
            :disabled="history.length === 0"
            @click="exportJson"
          >
            <template #leading><BaseIcon name="Download" :size="14" /></template>
            Export JSON
          </BaseButton>

          <BaseButton
            v-if="history.length > 0"
            :variant="confirmingClear ? 'danger' : 'ghost'"
            size="sm"
            @click="handleClear"
          >
            <template #leading><BaseIcon name="Trash" :size="14" /></template>
            {{ confirmingClear ? 'Confirm clear' : 'Clear all' }}
          </BaseButton>

          <p v-if="exportMessage" class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {{ exportMessage }}
          </p>
        </div>

        <div class="scroll-area flex-1 overflow-y-auto px-4 py-3">
          <p
            v-if="history.length === 0"
            class="surface-subtle mt-6 p-6 text-center text-sm muted-text"
          >
            No notifications have been dismissed yet. Trigger one from the playground and it will be
            logged here.
          </p>

          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="record in history"
              :key="`${record.id}-${record.dismissedAt}`"
              class="surface-subtle p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <BaseBadge :variant="record.type" size="sm">{{ record.type }}</BaseBadge>
                    <span class="text-sm font-medium break-words text-slate-900 dark:text-slate-100">
                      {{ record.title }}
                    </span>
                  </div>
                  <p
                    v-if="record.description"
                    class="mt-1 text-xs break-words muted-text"
                  >
                    {{ record.description }}
                  </p>
                  <p class="mt-1.5 text-[11px] muted-text">
                    <time :datetime="toIso(record.dismissedAt)">{{ formatRelative(record.dismissedAt) }}</time>
                    · source: {{ record.triggerSource }}
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-1.5">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    square
                    :aria-label="`Re-trigger notification: ${record.title}`"
                    @click="retrigger(record)"
                  >
                    <BaseIcon name="Play" :size="14" />
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    square
                    :aria-label="`Remove history entry: ${record.title}`"
                    @click="removeHistoryRecord(record.id)"
                  >
                    <BaseIcon name="X" :size="14" />
                  </BaseButton>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import { useNotify } from '@/composables/useNotify';
import { useNotifyStorage } from '@/composables/useNotifyStorage';
import type { NotificationHistoryRecord } from '@/types/notify';
import { DEFAULT_DURATION } from '@/utils/constants';

const props = defineProps<{
  /** Whether the drawer is visible. */
  open: boolean;
}>();

const emit = defineEmits<{
  /** Requests closing the drawer (backdrop click, Esc, close button). */
  close: [];
}>();

const { history, historyLimit, clearHistory, removeHistoryRecord, exportHistory, playgroundConfig } =
  useNotifyStorage();
const { notify } = useNotify();

const panelRef = ref<HTMLElement | null>(null);
const confirmingClear = ref(false);
const exportMessage = ref<string | null>(null);

let clearTimer: ReturnType<typeof setTimeout> | null = null;
let messageTimer: ReturnType<typeof setTimeout> | null = null;

/** Moves focus into the dialog when it opens (keyboard users land in place). */
watch(
  () => props.open,
  async (isOpen) => {
    confirmingClear.value = false;

    if (!isOpen) {
      return;
    }

    await nextTick();
    panelRef.value?.focus();
  },
);

/**
 * Largest time value the `Date` type can represent (8.64e15 ms, ~year 275760).
 * At or beyond it `toISOString()` throws `RangeError: Invalid time value`.
 */
const MAX_TIME_VALUE = 8.64e15;

/**
 * Rejects values the platform date APIs cannot represent.
 *
 * History records are hydrated from `localStorage`, which is untrusted input: a
 * record can carry a finite-but-absurd epoch such as `1e25` that passes
 * `Number.isFinite` in the storage sanitizer yet still detonates here.
 */
function isSafeTimestamp(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp < MAX_TIME_VALUE;
}

/**
 * ISO string for the `<time datetime>` attribute, or an empty string when the
 * value cannot be represented. This runs inside the template, so throwing here
 * would tear down the whole drawer subtree instead of degrading one field.
 */
function toIso(timestamp: number): string {
  if (!isSafeTimestamp(timestamp)) {
    return '';
  }

  try {
    return new Date(timestamp).toISOString();
  } catch {
    return '';
  }
}

/** Compact relative timestamp for the log list. */
function formatRelative(timestamp: number): string {
  if (!isSafeTimestamp(timestamp)) {
    return 'time unavailable';
  }

  const delta = Date.now() - timestamp;

  if (delta < 5_000) {
    return 'just now';
  }

  if (delta < 60_000) {
    return `${Math.round(delta / 1000)}s ago`;
  }

  if (delta < 3_600_000) {
    return `${Math.round(delta / 60_000)}m ago`;
  }

  if (delta < 86_400_000) {
    return `${Math.round(delta / 3_600_000)}h ago`;
  }

  return `${Math.round(delta / 86_400_000)}d ago`;
}

function flashMessage(message: string): void {
  exportMessage.value = message;

  if (messageTimer !== null) {
    clearTimeout(messageTimer);
  }

  messageTimer = setTimeout(() => {
    messageTimer = null;
    exportMessage.value = null;
  }, 2500);
}

/** Serializes the log and hands it to the browser as a download. */
function exportJson(): void {
  const payload = exportHistory();

  try {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vue-notify-history-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    flashMessage('History exported');
  } catch {
    flashMessage('Export is unavailable in this browser');
  }
}

/** Two-step destructive action: the first click only arms the confirmation. */
function handleClear(): void {
  if (!confirmingClear.value) {
    confirmingClear.value = true;

    if (clearTimer !== null) {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(() => {
      clearTimer = null;
      confirmingClear.value = false;
    }, 4000);

    return;
  }

  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  confirmingClear.value = false;
  clearHistory();
}

/** Replays a logged notification through the live store. */
function retrigger(record: NotificationHistoryRecord): void {
  notify({
    type: record.type,
    title: record.title,
    description: record.description,
    duration: DEFAULT_DURATION,
    position: playgroundConfig.value.position,
    sound: playgroundConfig.value.sound,
    showProgress: true,
    dismissible: true,
    triggerSource: 'user-action',
  });
}

onBeforeUnmount(() => {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
  }

  if (messageTimer !== null) {
    clearTimeout(messageTimer);
  }
});
</script>
