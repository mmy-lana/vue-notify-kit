<template>
  <figure class="w-full">
    <figcaption v-if="caption" class="mb-2 text-xs muted-text">{{ caption }}</figcaption>

    <p v-if="rows.length === 0" class="surface-subtle p-4 text-sm muted-text">
      {{ emptyMessage }}
    </p>

    <!--
      Responsive contract: a horizontally scrollable data grid above 480px, and
      fully stacked labelled cards below it, so no cell is ever clipped and the
      page never gains a horizontal scrollbar.
    -->
    <div
      v-else
      class="scroll-area overflow-x-auto rounded-card border border-slate-200 dark:border-slate-800"
    >
      <table
        class="w-full min-w-[560px] border-collapse text-left text-sm max-[480px]:block max-[480px]:min-w-0"
      >
        <caption class="sr-only">{{ caption ?? 'API reference table' }}</caption>

        <thead class="bg-slate-50 max-[480px]:hidden dark:bg-slate-900/60">
          <tr>
            <th
              v-for="column in COLUMNS"
              :key="column"
              scope="col"
              class="px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
            >
              {{ column }}
            </th>
          </tr>
        </thead>

        <tbody class="max-[480px]:block">
          <tr
            v-for="row in rows"
            :key="row.name"
            class="border-t border-slate-200 align-top max-[480px]:block max-[480px]:border-t max-[480px]:px-3 max-[480px]:py-2.5 dark:border-slate-800"
          >
            <th scope="row" class="px-3 py-2.5 font-normal max-[480px]:block max-[480px]:px-0">
              <span class="hidden max-[480px]:mb-0.5 max-[480px]:block max-[480px]:text-[11px] max-[480px]:font-semibold max-[480px]:tracking-wide max-[480px]:text-slate-500 max-[480px]:uppercase max-[480px]:dark:text-slate-400">
                Prop
              </span>
              <span class="inline-flex flex-wrap items-center gap-1.5">
                <code
                  class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-300"
                >
                  {{ row.name }}
                </code>
                <BaseBadge v-if="row.required" variant="error" size="sm">required</BaseBadge>
              </span>
            </th>

            <td class="px-3 py-2.5 max-[480px]:block max-[480px]:px-0">
              <span class="hidden max-[480px]:mb-0.5 max-[480px]:block max-[480px]:text-[11px] max-[480px]:font-semibold max-[480px]:tracking-wide max-[480px]:text-slate-500 max-[480px]:uppercase max-[480px]:dark:text-slate-400">
                Type
              </span>
              <code class="font-mono text-xs break-words text-slate-700 dark:text-slate-300">
                {{ row.type }}
              </code>
            </td>

            <td class="px-3 py-2.5 max-[480px]:block max-[480px]:px-0">
              <span class="hidden max-[480px]:mb-0.5 max-[480px]:block max-[480px]:text-[11px] max-[480px]:font-semibold max-[480px]:tracking-wide max-[480px]:text-slate-500 max-[480px]:uppercase max-[480px]:dark:text-slate-400">
                Default
              </span>
              <code
                v-if="row.default !== undefined"
                class="font-mono text-xs break-words text-slate-600 dark:text-slate-400"
              >
                {{ row.default }}
              </code>
              <span v-else class="text-xs muted-text">—</span>
            </td>

            <td class="px-3 py-2.5 text-slate-600 max-[480px]:block max-[480px]:px-0 max-[480px]:pt-1.5 dark:text-slate-300">
              <span class="hidden max-[480px]:mb-0.5 max-[480px]:block max-[480px]:text-[11px] max-[480px]:font-semibold max-[480px]:tracking-wide max-[480px]:text-slate-500 max-[480px]:uppercase max-[480px]:dark:text-slate-400">
                Description
              </span>
              {{ row.description }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<script setup lang="ts">
import BaseBadge from '@/components/ui/BaseBadge.vue';

/** One documented prop / event / config entry. */
interface PropsTableRow {
  /** Identifier shown in monospace (prop name, event name, key). */
  name: string;
  /** TypeScript type signature. */
  type: string;
  /** Default value as written in code; `undefined` renders an em dash. */
  default?: string;
  /** Behavioural description. */
  description: string;
  /** Marks the entry as mandatory. */
  required?: boolean;
}

withDefaults(
  defineProps<{
    /** Rows to display. */
    rows: PropsTableRow[];
    /** Visible caption above the grid. */
    caption?: string;
    /** Copy shown when `rows` is empty. */
    emptyMessage?: string;
  }>(),
  {
    caption: undefined,
    emptyMessage: 'No documented entries for this section yet.',
  },
);

/** Column headers, reused by the header row and the stacked card labels. */
const COLUMNS = ['Prop', 'Type', 'Default', 'Description'] as const;
</script>
