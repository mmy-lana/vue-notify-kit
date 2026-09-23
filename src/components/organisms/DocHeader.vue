<template>
  <header
    class="sticky top-0 z-[8500] border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85"
  >
    <div class="mx-auto flex w-full max-w-[1600px] items-center gap-2 px-3 py-2 sm:px-4 lg:px-6">
      <!-- Mobile navigation trigger -->
      <BaseButton
        variant="ghost"
        size="sm"
        square
        class="md:hidden"
        :aria-label="navigationOpen ? 'Close navigation menu' : 'Open navigation menu'"
        :aria-expanded="navigationOpen"
        aria-controls="doc-sidebar-drawer"
        @click="emit('toggle-navigation')"
      >
        <BaseIcon :name="navigationOpen ? 'X' : 'Menu'" :size="20" />
      </BaseButton>

      <!-- Tablet sidebar collapse toggle -->
      <BaseButton
        variant="ghost"
        size="sm"
        square
        class="hidden md:inline-flex lg:hidden"
        :aria-label="sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'"
        :aria-expanded="!sidebarCollapsed"
        @click="emit('toggle-sidebar')"
      >
        <BaseIcon name="Layers" :size="20" />
      </BaseButton>

      <RouterLink
        to="/"
        class="flex min-w-0 items-center gap-2 rounded-control px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label="vue-notify-kit home"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-600 text-white dark:bg-brand-500 dark:text-slate-950"
        >
          <BaseIcon name="Bell" :size="18" />
        </span>
        <span class="hidden min-w-0 flex-col leading-tight sm:flex">
          <span class="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            vue-notify-kit
          </span>
          <span class="truncate text-[11px] muted-text">Typed Vue 3 flash notifications</span>
        </span>
      </RouterLink>

      <nav class="ml-2 hidden items-center gap-1 lg:flex" aria-label="Primary">
        <RouterLink
          v-for="link in PRIMARY_LINKS"
          :key="link.path"
          :to="link.path"
          class="rounded-control px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
          active-class="bg-slate-200/80 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-1.5">
        <BaseButton
          variant="outline"
          size="sm"
          class="hidden sm:inline-flex"
          aria-label="Search the documentation"
          @click="openSearch"
        >
          <template #leading><BaseIcon name="Search" :size="15" /></template>
          <span class="hidden md:inline">Search</span>
          <kbd
            class="ml-1 hidden rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[10px] muted-text md:inline dark:border-slate-700"
          >
            /
          </kbd>
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          square
          class="sm:hidden"
          aria-label="Search the documentation"
          @click="openSearch"
        >
          <BaseIcon name="Search" :size="18" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          square
          :aria-label="`Color scheme: ${themeLabel}. Activate to switch.`"
          @click="cycleTheme"
        >
          <BaseIcon :name="themeIcon" :size="18" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          square
          :aria-label="isMuted ? 'Unmute notification sounds' : 'Mute notification sounds'"
          :aria-pressed="isMuted"
          @click="toggleMuted"
        >
          <BaseIcon :name="isMuted ? 'VolumeX' : 'Volume2'" :size="18" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          square
          class="relative"
          :aria-label="`Open notification history (${history.length} records)`"
          @click="emit('open-history')"
        >
          <BaseIcon name="History" :size="18" />
          <span
            v-if="history.length > 0"
            class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white dark:bg-brand-500 dark:text-slate-950"
          >
            {{ history.length > 9 ? '9+' : history.length }}
          </span>
        </BaseButton>

        <a
          :href="REPOSITORY_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="tap-target ml-0.5 inline-flex items-center justify-center rounded-control text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
          aria-label="Open the vue-notify-kit repository on GitHub"
        >
          <BaseIcon name="Github" :size="18" />
        </a>
      </div>
    </div>
  </header>

  <!-- Quick search dialog ------------------------------------------------- -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="searchOpen"
        class="fixed inset-0 z-drawer-panel flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-[2px]"
        @click.self="closeSearch"
      >
        <div
          ref="searchPanelRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-search-title"
          tabindex="-1"
          class="surface-panel flex w-full max-w-lg flex-col overflow-hidden shadow-2xl outline-none"
          @keydown.escape.stop="closeSearch"
        >
          <h2 id="doc-search-title" class="sr-only">Search the documentation</h2>

          <div class="border-b border-slate-200 p-3 dark:border-slate-800">
            <BaseInput
              v-model="searchQuery"
              type="search"
              placeholder="Search guides, APIs and playground…"
              aria-label="Search query"
              autocomplete="off"
              @submit="activateFirstResult"
            />
          </div>

          <ul v-if="searchResults.length > 0" class="scroll-area max-h-80 overflow-y-auto p-2">
            <li v-for="result in searchResults" :key="result.id">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 dark:hover:bg-slate-800"
                @click="goTo(result.path)"
              >
                <BaseIcon name="ChevronRight" :size="15" class="shrink-0 muted-text" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {{ result.title }}
                  </span>
                  <span class="block truncate text-xs muted-text">{{ result.section }}</span>
                </span>
                <BaseBadge v-if="result.badge" variant="neutral" size="sm">{{ result.badge }}</BaseBadge>
              </button>
            </li>
          </ul>

          <p v-else class="p-6 text-center text-sm muted-text">
            No section matches “{{ searchQuery }}”. Try “positions”, “promise” or “accessibility”.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { DOC_NAVIGATION_FLAT } from '@/content/navigation';
import { useColorTheme } from '@/composables/useColorTheme';
import { useNotify } from '@/composables/useNotify';
import { useNotifyStorage } from '@/composables/useNotifyStorage';
import { useRouter } from 'vue-router';

const props = withDefaults(
  defineProps<{
    /** Whether the mobile navigation drawer is open. */
    navigationOpen?: boolean;
    /** Whether the tablet sidebar is collapsed to icons. */
    sidebarCollapsed?: boolean;
  }>(),
  {
    navigationOpen: false,
    sidebarCollapsed: false,
  },
);

const emit = defineEmits<{
  /** Toggles the mobile navigation drawer. */
  'toggle-navigation': [];
  /** Toggles the tablet sidebar collapse state. */
  'toggle-sidebar': [];
  /** Opens the notification history drawer. */
  'open-history': [];
}>();

/** Upstream project URL, used only when no override is configured. */
const DEFAULT_REPOSITORY_URL = 'https://github.com/vue-notify-kit/vue-notify-kit';

/**
 * Repository link for the header action.
 *
 * Configurable through `VITE_REPO_URL` (see `.env.example`) so forks and
 * downstream templates point at their own remote. An empty or whitespace-only
 * value is treated as "unset" rather than being passed straight to `href`, which
 * would render a link that silently targets the current page.
 */
const REPOSITORY_URL = import.meta.env.VITE_REPO_URL?.trim() || DEFAULT_REPOSITORY_URL;

const PRIMARY_LINKS = [
  { label: 'Playground', path: '/' },
  { label: 'Documentation', path: '/docs' },
] as const;

const router = useRouter();
const { theme, cycleTheme } = useColorTheme();
const { isMuted, toggleMuted } = useNotify();
const { history } = useNotifyStorage();

const searchOpen = ref(false);
const searchQuery = ref('');
const searchPanelRef = ref<HTMLElement | null>(null);

const themeIcon = computed(() => {
  if (theme.value === 'light') {
    return 'Sun';
  }

  if (theme.value === 'dark') {
    return 'Moon';
  }

  return 'Monitor';
});

const themeLabel = computed(() =>
  theme.value === 'system' ? 'follow system' : theme.value,
);

const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  if (query.length === 0) {
    return DOC_NAVIGATION_FLAT.slice(0, 8);
  }

  return DOC_NAVIGATION_FLAT.filter(
    (item) =>
      item.title.toLowerCase().includes(query) || item.section.toLowerCase().includes(query),
  ).slice(0, 8);
});

async function openSearch(): Promise<void> {
  searchOpen.value = true;
  await nextTick();
  searchPanelRef.value?.focus();
}

function closeSearch(): void {
  searchOpen.value = false;
  searchQuery.value = '';
}

function goTo(path: string): void {
  closeSearch();
  void router.push(path);
}

function activateFirstResult(): void {
  const first = searchResults.value[0];

  if (first !== undefined) {
    goTo(first.path);
  }
}

/** `/` focuses search, Escape closes it — a documentation convention. */
function handleGlobalKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const isTyping =
    target !== null &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  if (event.key === '/' && !isTyping && !searchOpen.value) {
    event.preventDefault();
    void openSearch();
    return;
  }

  if (event.key === 'Escape' && searchOpen.value) {
    closeSearch();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
