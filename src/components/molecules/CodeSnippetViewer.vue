<template>
  <section class="surface-subtle overflow-hidden">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800"
    >
      <div class="flex min-w-0 items-center gap-2">
        <BaseIcon name="Terminal" :size="15" class="shrink-0 muted-text" />
        <span class="truncate font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
          {{ label }}
        </span>
        <BaseBadge v-if="language" variant="neutral" size="sm">{{ language }}</BaseBadge>
      </div>

      <BaseButton
        :variant="copied ? 'primary' : 'ghost'"
        size="xs"
        :aria-label="copied ? 'Code copied to clipboard' : 'Copy code to clipboard'"
        @click="copy"
      >
        <template #leading>
          <BaseIcon :name="copied ? 'Check' : 'Copy'" :size="14" />
        </template>
        {{ copied ? 'Copied' : 'Copy' }}
      </BaseButton>
    </header>

    <!--
      Horizontal overflow is contained here: the code block scrolls on its own
      axis so a long snippet can never widen the page on small screens.
    -->
    <div class="scroll-area overflow-x-auto" :style="{ maxHeight }">
      <pre class="min-w-full p-3 font-mono text-xs leading-relaxed whitespace-pre"><code>{{ code }}</code></pre>
    </div>

    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';

const props = withDefaults(
  defineProps<{
    /** Snippet source. Rendered verbatim inside a `<pre><code>` block. */
    code: string;
    /** Header label, usually a filename or a short caption. */
    label?: string;
    /** Optional language pill shown next to the label. */
    language?: string;
    /** CSS max-height for the scroll container. */
    maxHeight?: string;
  }>(),
  {
    label: 'snippet.ts',
    language: undefined,
    maxHeight: '22rem',
  },
);

/** Milliseconds the "Copied" confirmation stays visible. */
const COPY_FEEDBACK_MS = 2000;

const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

const statusMessage = computed(() =>
  copied.value ? 'Code copied to clipboard.' : 'Code block ready.',
);

/**
 * Clipboard write with a legacy fallback: `navigator.clipboard` is unavailable
 * on insecure origins and in some embedded webviews, where `execCommand` still
 * works. Failures never throw into the render path.
 */
async function copy(): Promise<void> {
  const succeeded = await writeToClipboard(props.code);

  if (!succeeded) {
    return;
  }

  copied.value = true;

  if (resetTimer !== null) {
    clearTimeout(resetTimer);
  }

  resetTimer = setTimeout(() => {
    resetTimer = null;
    copied.value = false;
  }, COPY_FEEDBACK_MS);
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea strategy below.
  }

  try {
    if (typeof document === 'undefined') {
      return false;
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'true');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    helper.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(helper);
    return ok;
  } catch {
    return false;
  }
}

onBeforeUnmount(() => {
  if (resetTimer !== null) {
    clearTimeout(resetTimer);
  }
});
</script>
