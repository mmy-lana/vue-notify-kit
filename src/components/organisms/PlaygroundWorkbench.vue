<template>
  <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <!-- ---------------------------------------------------------------- -->
    <!-- Configurator                                                     -->
    <!-- ---------------------------------------------------------------- -->
    <div class="flex min-w-0 flex-col gap-4">
      <PlaygroundControlGroup
        title="Payload"
        icon="Bell"
        :badge="config.type"
        description="Copy rendered inside the card. Title is required; everything else degrades to a documented default."
      >
        <div class="flex flex-col gap-4">
          <BaseSelect v-model="config.type" label="Type" :options="TYPE_OPTIONS" hint="Drives icon, accent color, chime and urgency." />
          <BaseInput
            v-model="config.title"
            label="Title"
            placeholder="Deployment finished"
            :error="titleError"
            :maxlength="80"
            hint="Shown as the notification headline."
          />
          <BaseInput
            v-model="config.description"
            label="Description"
            placeholder="Optional supporting copy"
            :maxlength="160"
            hint="Leave empty to render a compact single-line card."
          />
        </div>
      </PlaygroundControlGroup>

      <PlaygroundControlGroup
        title="Timers"
        icon="Sliders"
        :badge="durationLabel"
        description="Countdown behaviour. Duration 0 pins the notification until it is dismissed."
      >
        <div class="flex flex-col gap-4">
          <BaseSlider
            v-model="config.duration"
            label="Duration"
            :min="0"
            :max="15000"
            :step="100"
            unit=" ms"
            hint="0 = persistent"
          />
          <BaseSwitch
            v-model="config.showProgress"
            label="Show progress bar"
            description="GPU-scaled meter driven by the rAF countdown."
          />
          <BaseSwitch
            v-model="config.pauseOnHover"
            label="Pause on hover"
            description="Hovering or touching freezes the countdown at its exact remaining time."
          />
          <BaseSwitch
            v-model="config.sound"
            label="Play chime"
            description="Synthesised with the Web Audio API — no audio assets required."
          />
        </div>
      </PlaygroundControlGroup>

      <PlaygroundControlGroup
        title="Layout"
        icon="Layers"
        :badge="config.position"
        description="Anchors normalize to a centered position below 768px so thumb reach and swipe stay consistent."
      >
        <div class="flex flex-col gap-4">
          <BaseSelect v-model="config.position" label="Position" :options="POSITION_OPTIONS" />
          <BaseSelect
            v-model="config.stackingMode"
            label="Stacking mode"
            :options="STACKING_OPTIONS"
            hint="Collapsed modes overlap cards in a single grid cell; hover expands the stack."
          />
          <BaseSwitch
            v-model="config.dismissible"
            label="Dismissible"
            description="Enables the close button, Escape key and swipe-to-dismiss gesture."
          />
        </div>
      </PlaygroundControlGroup>

      <PlaygroundControlGroup
        title="Actions"
        icon="Zap"
        :badge="actionSummary"
        description="Action buttons render inside the card with a mandatory 8px gap and 44px hitboxes."
      >
        <div class="flex flex-col gap-4">
          <BaseSwitch v-model="config.hasPrimaryAction" label="Primary action" description="Rendered as a solid brand button." />
          <BaseInput
            v-if="config.hasPrimaryAction"
            v-model="config.primaryActionLabel"
            label="Primary label"
            :maxlength="24"
          />

          <BaseSwitch v-model="config.hasSecondaryAction" label="Secondary action" description="Rendered as an outlined button." />
          <BaseInput
            v-if="config.hasSecondaryAction"
            v-model="config.secondaryActionLabel"
            label="Secondary label"
            :maxlength="24"
          />
        </div>
      </PlaygroundControlGroup>

      <section class="surface-card p-4">
        <h2 class="section-title">Trigger</h2>
        <p class="mt-1 text-xs muted-text">
          Notifications are pushed through the same public API the library exposes.
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton variant="primary" :disabled="!canTrigger" @click="showNotification">
            <template #leading><BaseIcon name="Bell" :size="16" /></template>
            Show notification
          </BaseButton>

          <BaseButton
            variant="secondary"
            :loading="promisePending"
            :disabled="!canTrigger"
            @click="runPromiseDemo"
          >
            Promise toast
          </BaseButton>

          <BaseButton variant="outline" :disabled="!canTrigger" @click="showPersistent">
            Sticky toast
          </BaseButton>

          <BaseButton variant="outline" :disabled="!canTrigger" @click="burstFive">
            Burst ×5
          </BaseButton>

          <BaseButton variant="ghost" :disabled="activeCount === 0" @click="dismissAll">
            Dismiss all ({{ activeCount }})
          </BaseButton>
        </div>

        <h3 class="section-title mt-5">Presets</h3>
        <div class="mt-2 flex flex-wrap gap-2">
          <BaseButton
            v-for="preset in PRESETS"
            :key="preset.id"
            variant="outline"
            size="sm"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="resetConfig">
            <template #leading><BaseIcon name="History" :size="14" /></template>
            Reset
          </BaseButton>
        </div>

        <p v-if="lastEvent" class="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {{ lastEvent }}
        </p>

        <!--
          Persistent counter (not auto-cleared like `lastEvent`) so a duplicate
          action invocation is directly observable: a rapid double-tap on a
          primary action must still increment this exactly once.
        -->
        <p
          v-if="primaryActionRuns > 0"
          data-testid="primary-action-runs"
          class="mt-1 text-xs font-medium muted-text"
        >
          Primary action handler invocations: {{ primaryActionRuns }}
        </p>
      </section>
    </div>

    <!-- ---------------------------------------------------------------- -->
    <!-- Inspector                                                        -->
    <!-- ---------------------------------------------------------------- -->
    <div class="flex min-w-0 flex-col gap-4">
      <section class="surface-card p-4">
        <h2 class="section-title">Live metrics</h2>
        <dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="surface-subtle p-2.5">
            <dt class="text-[11px] tracking-wide muted-text uppercase">Active</dt>
            <dd class="font-mono text-lg font-semibold text-slate-900 dark:text-slate-50">
              {{ activeCount }}
            </dd>
          </div>
          <div class="surface-subtle p-2.5">
            <dt class="text-[11px] tracking-wide muted-text uppercase">History</dt>
            <dd class="font-mono text-lg font-semibold text-slate-900 dark:text-slate-50">
              {{ history.length }}
            </dd>
          </div>
          <div class="surface-subtle p-2.5">
            <dt class="text-[11px] tracking-wide muted-text uppercase">Per anchor</dt>
            <dd class="font-mono text-lg font-semibold text-slate-900 dark:text-slate-50">
              {{ maxStackForPosition }}
            </dd>
          </div>
          <div class="surface-subtle p-2.5">
            <dt class="text-[11px] tracking-wide muted-text uppercase">Storage</dt>
            <dd class="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {{ isPersistent() ? 'Persisted' : 'Memory only' }}
            </dd>
          </div>
        </dl>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <BaseButton :variant="isMuted ? 'danger' : 'outline'" size="sm" @click="toggleMuted">
            <template #leading>
              <BaseIcon :name="isMuted ? 'VolumeX' : 'Volume2'" :size="14" />
            </template>
            {{ isMuted ? 'Sound muted' : 'Sound on' }}
          </BaseButton>
          <BaseButton variant="outline" size="sm" @click="openHistory">
            <template #leading><BaseIcon name="History" :size="14" /></template>
            Open history
          </BaseButton>
        </div>

        <p v-if="persistenceError" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {{ persistenceError }}
        </p>
      </section>

      <section id="payload" class="surface-card scroll-mt-20 p-4">
        <h2 class="section-title">Payload inspector</h2>
        <p class="mt-1 text-xs muted-text">
          Exactly what <code class="font-mono">notify()</code> receives after clamping and validation.
        </p>
        <div class="scroll-area mt-3 max-h-72 overflow-auto rounded-control bg-slate-950 p-3">
          <pre class="font-mono text-xs leading-relaxed whitespace-pre text-slate-200"><code>{{ payloadPreview }}</code></pre>
        </div>
      </section>

      <div id="generated-code" class="scroll-mt-20">
        <CodeSnippetViewer :code="generatedCode" label="usage.vue" language="ts" max-height="20rem" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import CodeSnippetViewer from '@/components/molecules/CodeSnippetViewer.vue';
import PlaygroundControlGroup from '@/components/molecules/PlaygroundControlGroup.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseSlider from '@/components/ui/BaseSlider.vue';
import BaseSwitch from '@/components/ui/BaseSwitch.vue';
import { useNotify } from '@/composables/useNotify';
import { useNotifyStorage } from '@/composables/useNotifyStorage';
import type {
  CreateNotificationInput,
  NotificationAction,
  PlaygroundConfiguration,
} from '@/types/notify';
import {
  MAX_STACK_PER_POSITION,
  NOTIFICATION_POSITION_LABELS,
  NOTIFICATION_POSITIONS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  STACKING_MODE_LABELS,
  STACKING_MODES,
} from '@/utils/constants';

const emit = defineEmits<{
  /** Requests opening the history drawer owned by the parent view. */
  'open-history': [];
}>();

const { notify, activeCount, byPosition, dismissAll, isMuted, toggleMuted, notifications } = useNotify();
const {
  playgroundConfig: config,
  updatePlaygroundConfig,
  resetPlaygroundConfig,
  isPersistent,
  persistenceError,
  history,
} = useNotifyStorage();

const promisePending = ref(false);
const lastEvent = ref<string | null>(null);
let eventTimer: ReturnType<typeof setTimeout> | null = null;

/** Invocation counter for the async primary action (re-entrancy probe). */
const primaryActionRuns = ref(0);

/**
 * Simulated network latency for the primary action. Long enough that a rapid
 * double-tap lands both clicks while the first handler is still pending, which
 * is the exact window the in-flight lock has to cover.
 */
const ACTION_LATENCY_MS = 1500;

const TYPE_OPTIONS = NOTIFICATION_TYPES.map((type) => ({
  value: type,
  label: NOTIFICATION_TYPE_LABELS[type],
}));

const POSITION_OPTIONS = NOTIFICATION_POSITIONS.map((position) => ({
  value: position,
  label: NOTIFICATION_POSITION_LABELS[position],
}));

const STACKING_OPTIONS = STACKING_MODES.map((mode) => ({
  value: mode,
  label: STACKING_MODE_LABELS[mode],
}));

const titleError = computed(() =>
  config.value.title.trim().length === 0 ? 'A title is required before a notification can be shown.' : undefined,
);

const canTrigger = computed(() => titleError.value === undefined);

const durationLabel = computed(() =>
  config.value.duration === 0 ? 'persistent' : `${config.value.duration} ms`,
);

const actionSummary = computed(() => {
  const count = (config.value.hasPrimaryAction ? 1 : 0) + (config.value.hasSecondaryAction ? 1 : 0);

  if (count === 0) {
    return 'none';
  }

  return count === 1 ? '1 action' : `${count} actions`;
});

const maxStackForPosition = computed(() =>
  Math.max(
    0,
    ...NOTIFICATION_POSITIONS.map((position) => byPosition.value[position].length),
  ),
);

/** Builds the action list exactly as the trigger will submit it. */
function buildActions(): NotificationAction[] {
  const actions: NotificationAction[] = [];

  if (config.value.hasPrimaryAction) {
    actions.push({
      id: 'primary',
      label: config.value.primaryActionLabel.trim() || 'Confirm',
      variant: 'primary',
      ariaLabel: `Run primary action for ${config.value.title}`,
      run: async (id: string) => {
        primaryActionRuns.value += 1;
        announce(`Primary action #${primaryActionRuns.value} running for ${id.slice(0, 8)}…`);

        await new Promise<void>((resolve) => {
          setTimeout(resolve, ACTION_LATENCY_MS);
        });

        announce(`Primary action #${primaryActionRuns.value} finished for ${id.slice(0, 8)}…`);
      },
    });
  }

  if (config.value.hasSecondaryAction) {
    actions.push({
      id: 'secondary',
      label: config.value.secondaryActionLabel.trim() || 'Dismiss',
      variant: 'secondary',
      ariaLabel: `Run secondary action for ${config.value.title}`,
      run: (id: string) => {
        announce(`Secondary action ran for ${id.slice(0, 8)}…`);
      },
    });
  }

  return actions;
}

function currentInput(): CreateNotificationInput {
  return {
    type: config.value.type,
    title: config.value.title.trim() || 'Notification',
    description: config.value.description.trim() || undefined,
    position: config.value.position,
    duration: config.value.duration,
    showProgress: config.value.showProgress,
    dismissible: config.value.dismissible,
    pauseOnHover: config.value.pauseOnHover,
    sound: config.value.sound,
    actions: buildActions(),
    triggerSource: 'playground',
  };
}

const payloadPreview = computed(() => {
  const input = currentInput();

  return JSON.stringify(
    {
      ...input,
      actions: input.actions?.map((action) => ({
        id: action.id,
        label: action.label,
        variant: action.variant,
        run: '(notificationId) => void',
      })),
    },
    null,
    2,
  );
});

/** Escapes a value for safe interpolation into the generated snippet. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const generatedCode = computed(() => {
  const input = currentInput();
  const lines: string[] = [];

  lines.push("import { useNotify } from 'vue-notify-kit';");
  lines.push('');
  lines.push('const { notify } = useNotify();');
  lines.push('');
  lines.push('notify({');
  lines.push(`  type: ${quote(input.type ?? 'info')},`);
  lines.push(`  title: ${quote(input.title)},`);

  if (input.description !== undefined) {
    lines.push(`  description: ${quote(input.description)},`);
  }

  lines.push(`  position: ${quote(input.position ?? 'top-right')},`);
  lines.push(`  duration: ${input.duration ?? 0},`);
  lines.push(`  showProgress: ${String(input.showProgress ?? true)},`);
  lines.push(`  dismissible: ${String(input.dismissible ?? true)},`);
  lines.push(`  pauseOnHover: ${String(input.pauseOnHover ?? true)},`);
  lines.push(`  sound: ${String(input.sound ?? false)},`);

  const actions = input.actions ?? [];

  if (actions.length > 0) {
    lines.push('  actions: [');
    for (const action of actions) {
      lines.push('    {');
      lines.push(`      id: ${quote(action.id)},`);
      lines.push(`      label: ${quote(action.label)},`);
      lines.push(`      variant: ${quote(action.variant)},`);
      lines.push(`      run: (notificationId) => handleAction(notificationId, ${quote(action.id)}),`);
      lines.push('    },');
    }
    lines.push('  ],');
  }

  lines.push('});');

  return lines.join('\n');
});

function announce(message: string): void {
  lastEvent.value = message;

  if (eventTimer !== null) {
    clearTimeout(eventTimer);
  }

  eventTimer = setTimeout(() => {
    eventTimer = null;
    lastEvent.value = null;
  }, 3000);
}

function showNotification(): void {
  const id = notify(currentInput());
  announce(`Pushed ${id.slice(0, 8)}… to ${config.value.position}`);
}

function showPersistent(): void {
  notify({
    ...currentInput(),
    duration: 0,
    title: config.value.title.trim() || 'Persistent notice',
    description: config.value.description.trim() || 'Stays on screen until it is dismissed.',
  });
  announce('Sticky notification pushed (duration 0)');
}

/** Demonstrates the promise bridge: loading → success without stutter. */
async function runPromiseDemo(): Promise<void> {
  promisePending.value = true;
  announce('Promise toast running…');

  try {
    await notify.promise(
      () =>
        new Promise<{ release: string }>((resolve) => {
          setTimeout(() => {
            resolve({ release: 'v1.4.0' });
          }, 1800);
        }),
      {
        loading: 'Deploying to production…',
        success: (data) => `Deployed ${data.release}`,
        error: (error) => (error instanceof Error ? error.message : 'Deployment failed'),
        description: {
          loading: 'The toast re-arms its timer when the promise settles.',
          success: 'Rollout completed with no errors.',
        },
      },
    );

    announce('Promise resolved — loading toast became a success toast');
  } catch {
    announce('Promise rejected — the failure is surfaced in the toast');
  } finally {
    promisePending.value = false;
  }
}

/** Fires six notifications to demonstrate synchronous per-anchor eviction. */
function burstFive(): void {
  for (let index = 1; index <= MAX_STACK_PER_POSITION + 1; index += 1) {
    notify({
      ...currentInput(),
      title: `${config.value.title.trim() || 'Notification'} #${index}`,
      description: `Burst item ${index} of ${MAX_STACK_PER_POSITION + 1}`,
    });
  }

  announce(`Burst of ${MAX_STACK_PER_POSITION + 1} pushed — the oldest is evicted per anchor`);
}

interface PlaygroundPreset {
  id: string;
  label: string;
  patch: Partial<PlaygroundConfiguration>;
}

const PRESETS: PlaygroundPreset[] = [
  {
    id: 'deploy',
    label: 'Successful deploy',
    patch: {
      type: 'success',
      title: 'Deployment finished',
      description: 'Build #1482 shipped to production in 42s.',
      position: 'top-right',
      duration: 4000,
      showProgress: true,
      hasPrimaryAction: true,
      primaryActionLabel: 'View release',
      hasSecondaryAction: false,
    },
  },
  {
    id: 'failure',
    label: 'Failed pipeline',
    patch: {
      type: 'error',
      title: 'Pipeline failed',
      description: 'Tests failed in 3 files. Nothing was deployed.',
      position: 'top-center',
      duration: 0,
      showProgress: false,
      hasPrimaryAction: true,
      primaryActionLabel: 'Retry build',
      hasSecondaryAction: true,
      secondaryActionLabel: 'Open logs',
    },
  },
  {
    id: 'promise',
    label: 'Long running task',
    patch: {
      type: 'loading',
      title: 'Syncing workspace',
      description: 'Indexing 12,480 files…',
      position: 'bottom-right',
      duration: 0,
      showProgress: false,
      dismissible: false,
      hasPrimaryAction: false,
      hasSecondaryAction: false,
    },
  },
  {
    id: 'warning',
    label: 'Quota warning',
    patch: {
      type: 'warning',
      title: 'Storage almost full',
      description: '18 MB of 20 MB used. Old entries will be pruned automatically.',
      position: 'bottom-left',
      duration: 8000,
      showProgress: true,
      sound: true,
      hasPrimaryAction: true,
      primaryActionLabel: 'Manage',
      hasSecondaryAction: true,
      secondaryActionLabel: 'Later',
    },
  },
];

function applyPreset(preset: PlaygroundPreset): void {
  updatePlaygroundConfig(preset.patch);
  announce(`Preset applied: ${preset.label}`);
}

function resetConfig(): void {
  resetPlaygroundConfig();
  announce('Configuration reset to defaults');
}

function openHistory(): void {
  emit('open-history');
}

onBeforeUnmount(() => {
  if (eventTimer !== null) {
    clearTimeout(eventTimer);
  }
});

/** Exposed for the parent view's status strip. */
defineExpose({ activeCount, notifications });
</script>
