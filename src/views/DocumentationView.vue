<template>
  <div class="flex max-w-4xl flex-col gap-8">
    <header>
      <div class="flex flex-wrap items-center gap-2">
        <BaseBadge variant="brand" size="sm">Documentation</BaseBadge>
        <BaseBadge variant="success" size="sm">Vue 3.5+</BaseBadge>
        <BaseBadge variant="neutral" size="sm">TypeScript strict</BaseBadge>
      </div>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
        vue-notify-kit
      </h1>
      <p class="mt-2 max-w-3xl text-sm muted-text">
        A headless flash-notification toolkit: typed from the store outward, driven by
        <code class="font-mono">requestAnimationFrame</code> countdowns, and accessible by default —
        live regions, 44px touch targets, keyboard dismissal and reduced-motion support included.
      </p>
    </header>

    <!-- Installation ---------------------------------------------------- -->
    <section id="installation" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Installation</h2>
      <p class="mt-2 text-sm muted-text">
        This repository is a reference architecture, not a published package. Copy the primitives
        below into your own project, then mount the viewport once, near the root of your
        application.
      </p>
      <div class="mt-3 flex flex-col gap-3">
        <CodeSnippetViewer :code="INSTALL_SNIPPET" label="terminal" language="bash" max-height="12rem" />
        <CodeSnippetViewer :code="MOUNT_SNIPPET" label="App.vue" language="vue" max-height="16rem" />
      </div>
    </section>

    <!-- Quick start ----------------------------------------------------- -->
    <section id="quick-start" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Quick start</h2>
      <p class="mt-2 text-sm muted-text">
        The store is a singleton composable. Call it from setup or from plain modules — the same API
        works in both places, and every call returns the new notification id.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="QUICK_START_SNIPPET" label="useDeploy.ts" language="ts" />
      </div>

      <div class="mt-4">
        <PropsTable caption="CreateNotificationInput — everything except title is optional" :rows="CREATE_INPUT_ROWS" />
      </div>
    </section>

    <!-- Styling --------------------------------------------------------- -->
    <section id="styling" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Styling &amp; theming</h2>
      <p class="mt-2 text-sm muted-text">
        Design tokens live in one Tailwind v4 <code class="font-mono">@theme</code> block. Override
        the semantic accents to re-skin every notification surface at once, and use
        <code class="font-mono">customClass</code> for one-off cards.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="THEME_SNIPPET" label="assets/main.css" language="css" />
      </div>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        <li
          v-for="token in COLOR_TOKENS"
          :key="token.name"
          class="surface-subtle flex items-center gap-3 p-3"
        >
          <span :class="['h-8 w-8 shrink-0 rounded-control border border-black/10', token.swatch]" />
          <span class="min-w-0">
            <span class="block font-mono text-xs text-slate-900 dark:text-slate-100">{{ token.name }}</span>
            <span class="block text-xs muted-text">{{ token.usage }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Positions ------------------------------------------------------- -->
    <section id="positions" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Positions &amp; stacking</h2>
      <p class="mt-2 text-sm muted-text">
        Six anchors are supported. Below 768px every anchor normalizes to
        <code class="font-mono">top-center</code> or <code class="font-mono">bottom-center</code> so
        thumb reach and swipe gestures stay predictable on phones.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="POSITION_SNIPPET" label="anchors.ts" language="ts" />
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <BaseBadge v-for="position in NOTIFICATION_POSITIONS" :key="position" variant="neutral" size="sm">
          {{ position }}
        </BaseBadge>
      </div>
      <ul class="mt-3 flex flex-col gap-2 text-sm muted-text">
        <li><strong class="text-slate-900 dark:text-slate-100">expanded</strong> — every card in flow, all interactive.</li>
        <li><strong class="text-slate-900 dark:text-slate-100">stacked</strong> — cards share one grid cell with a 14px step and 5% scale decrement; hovering the anchor expands the stack.</li>
        <li><strong class="text-slate-900 dark:text-slate-100">condensed</strong> — an 8px step, and everything past the third card is hidden but still mounted.</li>
      </ul>
    </section>

    <!-- Timers ---------------------------------------------------------- -->
    <section id="timers" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Timers &amp; pausing</h2>
      <p class="mt-2 text-sm muted-text">
        Countdowns are derived from real elapsed time
        (<code class="font-mono">targetTime - performance.now()</code>) rather than accumulated
        ticks, so progress bars stay honest in throttled background tabs. Pausing freezes the exact
        remaining time; resuming re-arms a fresh frame handle.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="TIMER_SNIPPET" label="timers.ts" language="ts" />
      </div>
      <PropsTable class="mt-4" caption="Timer-related fields" :rows="TIMER_ROWS" />
    </section>

    <!-- Actions --------------------------------------------------------- -->
    <section id="actions" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Action buttons</h2>
      <p class="mt-2 text-sm muted-text">
        Actions render inside the card with a mandatory 8px gap between targets and a 44px minimum
        hitbox on each button. A successful handler dismisses the toast; a rejection keeps it on
        screen and swaps the card into an error state with the failure message.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="ACTION_SNIPPET" label="actions.ts" language="ts" />
      </div>
      <PropsTable class="mt-4" caption="NotificationAction" :rows="ACTION_ROWS" />
    </section>

    <!-- Promise bridge -------------------------------------------------- -->
    <section id="promises" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Promise bridge</h2>
      <p class="mt-2 text-sm muted-text">
        <code class="font-mono">notify.promise()</code> spawns a sticky loading card, swaps it to
        success or error when the promise settles, and re-arms the countdown at that moment — the
        timer transition from <code class="font-mono">0</code> to a positive duration starts a fresh
        ticker synchronously.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="PROMISE_SNIPPET" label="deploy.ts" language="ts" />
      </div>
      <PropsTable class="mt-4" caption="PromiseNotificationMessages&lt;T&gt;" :rows="PROMISE_ROWS" />
    </section>

    <!-- Sound ----------------------------------------------------------- -->
    <section id="sound" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Sound &amp; audio</h2>
      <p class="mt-2 text-sm muted-text">
        Chimes are synthesised with the Web Audio API, so no audio files are shipped. The context is
        created lazily on the first user gesture, and every failure mode — unsupported runtime,
        blocked autoplay, suspended context — degrades silently.
      </p>
      <PropsTable class="mt-3" caption="Chime algorithms" :rows="SOUND_ROWS" />
      <div class="mt-3">
        <CodeSnippetViewer :code="SOUND_SNIPPET" label="sound.ts" language="ts" max-height="12rem" />
      </div>
    </section>

    <!-- Gestures -------------------------------------------------------- -->
    <section id="gestures" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Swipe gestures</h2>
      <p class="mt-2 text-sm muted-text">
        Horizontal drags translate the card, decay its opacity toward the commit threshold, and
        either spring back or animate off-screen before dismissal runs. The
        <code class="font-mono">touchmove</code> listener is registered imperatively with
        <code class="font-mono">{ passive: false }</code> — Vue's
        <code class="font-mono">.passive</code> modifier would make it passive and break
        <code class="font-mono">preventDefault()</code>.
      </p>
      <div class="mt-3">
        <CodeSnippetViewer :code="GESTURE_SNIPPET" label="gestures.md" language="md" max-height="14rem" />
      </div>
    </section>

    <!-- History --------------------------------------------------------- -->
    <section id="history" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">History &amp; persistence</h2>
      <p class="mt-2 text-sm muted-text">
        Dismissals are appended to a FIFO log capped at {{ historyLimit }} records and written
        through a 300ms debounced pipeline. Payloads are re-validated on hydration, so corrupted or
        legacy data self-heals instead of reaching the UI. Cross-tab updates arrive via the
        <code class="font-mono">storage</code> event, guarded so they never echo back.
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <BaseButton variant="outline" size="sm" @click="historyDrawer.open()">
          <template #leading><BaseIcon name="History" :size="14" /></template>
          Open the history drawer
        </BaseButton>
        <BaseBadge variant="neutral" size="sm">
          {{ history.length }} record{{ history.length === 1 ? '' : 's' }} stored
        </BaseBadge>
        <BaseBadge :variant="isPersistent() ? 'success' : 'warning'" size="sm">
          {{ isPersistent() ? 'localStorage available' : 'memory only (private mode?)' }}
        </BaseBadge>
      </div>
      <div class="mt-3">
        <CodeSnippetViewer :code="HISTORY_SNIPPET" label="history.ts" language="ts" />
      </div>
    </section>

    <!-- useNotify ------------------------------------------------------- -->
    <section id="notify-api" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
        <code class="font-mono">useNotify()</code>
      </h2>
      <PropsTable class="mt-3" caption="Returned store contract" :rows="STORE_API_ROWS" />
    </section>

    <!-- NotificationItem ------------------------------------------------ -->
    <section id="item-schema" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">NotificationItem</h2>
      <p class="mt-2 text-sm muted-text">
        The canonical, fully-populated shape produced by the factory. No timer field is ever null
        once an item exists.
      </p>
      <PropsTable class="mt-3" caption="NotificationItem fields" :rows="ITEM_SCHEMA_ROWS" />
    </section>

    <!-- Store methods --------------------------------------------------- -->
    <section id="store-api" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Store methods</h2>
      <PropsTable class="mt-3" caption="Control surface" :rows="STORE_METHOD_ROWS" />
    </section>

    <!-- Icons ----------------------------------------------------------- -->
    <section id="icons" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Icon registry</h2>
      <p class="mt-2 text-sm muted-text">
        Every glyph is an inline 24×24 stroke drawing that inherits
        <code class="font-mono">currentColor</code>. Decorative by default; pass
        <code class="font-mono">label</code> when an icon stands alone.
      </p>
      <ul class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <li
          v-for="icon in DOC_ICON_SHOWCASE"
          :key="icon"
          class="surface-subtle flex flex-col items-center gap-1.5 p-3 text-center"
        >
          <BaseIcon :name="icon" :size="22" class="text-slate-700 dark:text-slate-200" />
          <span class="w-full truncate font-mono text-[10px] muted-text">{{ icon }}</span>
        </li>
      </ul>
    </section>

    <!-- Accessibility --------------------------------------------------- -->
    <section id="accessibility" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Accessibility</h2>
      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="entry in ACCESSIBILITY_NOTES"
          :key="entry.title"
          class="surface-card flex gap-3 p-3"
        >
          <BaseIcon name="CheckCircle" :size="18" class="mt-0.5 shrink-0 text-notify-success" />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-slate-900 dark:text-slate-100">{{ entry.title }}</span>
            <span class="mt-0.5 block text-sm muted-text">{{ entry.detail }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Responsive ------------------------------------------------------ -->
    <section id="responsive" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Responsive matrix</h2>
      <p class="mt-2 text-sm muted-text">
        The same verified across 360, 390, 430, 768 and 1024px+ viewports: no horizontal scrolling,
        no hover-only controls, and touch targets that never drop below 44px.
      </p>
      <PropsTable class="mt-3" caption="Breakpoint behaviour" :rows="BREAKPOINT_ROWS" />
    </section>

    <!-- Best practices -------------------------------------------------- -->
    <section id="best-practices" class="scroll-mt-20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">Best practices</h2>
      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="rule in BEST_PRACTICES"
          :key="rule.title"
          class="surface-subtle flex gap-3 p-3"
        >
          <BaseIcon name="Zap" :size="18" class="mt-0.5 shrink-0 text-notify-warning" />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-slate-900 dark:text-slate-100">{{ rule.title }}</span>
            <span class="mt-0.5 block text-sm muted-text">{{ rule.detail }}</span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import CodeSnippetViewer from '@/components/molecules/CodeSnippetViewer.vue';
import PropsTable from '@/components/molecules/PropsTable.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseIcon from '@/components/ui/BaseIcon.vue';
import { BREAKPOINT_MATRIX, DOC_ICON_SHOWCASE } from '@/content/navigation';
import { useHistoryDrawer } from '@/composables/useHistoryDrawer';
import { useNotifyStorage } from '@/composables/useNotifyStorage';
import { NOTIFICATION_POSITIONS } from '@/utils/constants';

const { history, historyLimit, isPersistent } = useNotifyStorage();
const historyDrawer = useHistoryDrawer();

// NOTE: this project is `private` and unpublished, so there is deliberately no
// registry install command here. Publishing one would turn every copy-paste of
// this page into a supply-chain (typosquatting) exposure.
const INSTALL_SNIPPET = `# vue-notify-kit is an in-repo reference implementation.
# It is NOT published to npm, so there is nothing to install.
# Copy the primitives you need into your own project:

mkdir -p src/composables src/components src/utils src/types
cp <this-repo>/src/composables/useNotify.ts        src/composables/
cp <this-repo>/src/composables/useNotifyStorage.ts src/composables/
cp <this-repo>/src/composables/useSwipeDismiss.ts  src/composables/
cp <this-repo>/src/composables/useNotificationSound.ts src/composables/
cp -r <this-repo>/src/components/molecules src/components/
cp -r <this-repo>/src/components/organisms src/components/
cp -r <this-repo>/src/components/ui         src/components/
cp -r <this-repo>/src/utils src/utils/
cp -r <this-repo>/src/types src/types/`;

// NOTE: the closing tags below are written with an escaped slash so the SFC
// parser does not mistake them for the end of this component's own script block.
const MOUNT_SNIPPET = `<script setup lang="ts">
import DocLayout from '@/layouts/DocLayout.vue';
<\/script>

<template>
  <DocLayout>
    <RouterView />
  </DocLayout>
<\/template>`;

const QUICK_START_SNIPPET = `// Local path in your own project — there is no 'vue-notify-kit' package.
import { useNotify } from '@/composables/useNotify';

const { notify } = useNotify();

// Fire and forget — returns the notification id.
const id = notify({
  type: 'success',
  title: 'Deployment finished',
  description: 'Build #1482 shipped in 42s.',
  position: 'top-right',
  duration: 4000,
});

// Patch it later; duration 0 → positive re-arms the countdown.
const { updateNotification, dismiss, dismissAll } = useNotify();
updateNotification(id, { title: 'Deployment verified' });
dismiss(id);
dismissAll();`;

const THEME_SNIPPET = `@import 'tailwindcss';

@theme {
  /* Semantic accents used by every notification surface */
  --color-notify-info: #0284c7;
  --color-notify-success: #16a34a;
  --color-notify-warning: #d97706;
  --color-notify-error: #dc2626;
  --color-notify-loading: #7c3aed;
  --color-notify-neutral: #475569;

  /* Layering scale */
  --z-toast: 9999;
  --z-drawer-panel: 9100;
  --z-drawer-nav: 9000;
}`;

const POSITION_SNIPPET = `notify({ title: 'Corner card', position: 'top-left' });
notify({ title: 'Centered card', position: 'bottom-center' });

// Below 768px the viewport normalizes automatically:
//   top-*    -> top-center
//   bottom-* -> bottom-center`;

const TIMER_SNIPPET = `// Persistent: stays until dismissed
notify({ title: 'Uploading…', type: 'loading', duration: 0 });

// Hover, focus or touch-hold freezes at the exact remaining time
const { pause, resume } = useNotify();
pause(id);
resume(id);

// Focus-loss pausing is opt-out per notification
notify({ title: 'Long running', pauseOnFocusLoss: false });`;

const ACTION_SNIPPET = `notify({
  title: 'Deployment finished',
  duration: 0, // keep the card until the user decides
  actions: [
    {
      id: 'view',
      label: 'View release',
      variant: 'primary',
      ariaLabel: 'Open the release notes',
      run: async (notificationId) => {
        await router.push('/releases/1482');
        // Resolving dismisses the toast; throwing flips it into an error card.
      },
    },
  ],
});`;

const PROMISE_SNIPPET = `await notify.promise(
  () => api.deploy({ release: 'v1.4.0' }),
  {
    loading: 'Deploying to production…',
    success: (data) => \`Deployed \${data.release}\`,
    error: (error) => (error instanceof Error ? error.message : 'Deployment failed'),
    description: {
      loading: 'The timer re-arms when the promise settles.',
      success: 'Rollout completed with no errors.',
    },
  },
);`;

const SOUND_SNIPPET = `// Per notification
notify({ type: 'error', title: 'Pipeline failed', sound: true });

// Global mute (shared by every consumer)
const { isMuted, setMuted, toggleMuted } = useNotify();
toggleMuted();`;

const GESTURE_SNIPPET = `Threshold : 96px horizontal, or 0.4px/ms flick velocity
Snap      : CSS spring back to translateX(0), opacity restored
Commit    : translateX(±100vw) then dismissal, history recorded
Scroll    : vertical drags are ignored so lists keep scrolling
Multi     : two-finger gestures abandon the swipe entirely`;

const HISTORY_SNIPPET = `const { history, clearHistory, exportHistory } = useNotifyStorage();

history.value;        // newest first, capped at 50 records
exportHistory();      // pretty-printed JSON snapshot
clearHistory();       // persists the empty log immediately`;

interface DocRow {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
}

const CREATE_INPUT_ROWS: DocRow[] = [
  { name: 'title', type: 'string', description: 'Headline copy. Trimmed; blank values fall back to “Notification”.', required: true },
  { name: 'type', type: 'NotificationType', default: "'info'", description: 'info · success · warning · error · loading · default.' },
  { name: 'description', type: 'string', default: '—', description: 'Supporting copy; omit for a compact single-line card.' },
  { name: 'position', type: 'NotificationPosition', default: "'top-right'", description: 'Anchor for the card; normalized below 768px.' },
  { name: 'duration', type: 'number', default: '4000', description: 'Lifetime in ms, clamped to 0–15000. 0 is persistent.' },
  { name: 'dismissible', type: 'boolean', default: 'true', description: 'Enables close button, Escape and swipe to dismiss.' },
  { name: 'showProgress', type: 'boolean', default: 'true', description: 'Renders the countdown progress meter.' },
  { name: 'pauseOnHover', type: 'boolean', default: 'true', description: 'Freezes the countdown while hovered.' },
  { name: 'pauseOnFocusLoss', type: 'boolean', default: 'true', description: 'Freezes the countdown while the window is blurred.' },
  { name: 'sound', type: 'boolean', default: 'false', description: 'Plays the synthesised chime for this type.' },
  { name: 'actions', type: 'NotificationAction[]', default: '[]', description: 'Action buttons; entries without a label or handler are dropped.' },
  { name: 'customClass', type: 'string', default: '—', description: 'Extra classes merged onto the card surface.' },
  { name: 'triggerSource', type: "'playground' | 'api' | 'user-action'", default: "'api'", description: 'Origin recorded in the history log.' },
];

const TIMER_ROWS: DocRow[] = [
  { name: 'duration', type: 'number', default: '4000', description: 'Total lifetime; clamped to 0–15000 ms.' },
  { name: 'remainingTime', type: 'number', default: '= duration', description: 'Live countdown, updated each animation frame.' },
  { name: 'timerStartedAt', type: 'number', description: 'Monotonic start stamp, never null.', default: 'performance.now()' },
  { name: 'isPaused', type: 'boolean', default: 'false', description: 'True while hovered, focused, held or blurred.' },
  { name: 'isDismissing', type: 'boolean', default: 'false', description: 'Marks the 200ms exit transition window.' },
];

const ACTION_ROWS: DocRow[] = [
  { name: 'id', type: 'string', description: 'Stable key; generated when omitted.', required: true },
  { name: 'label', type: 'string', description: 'Visible button text.', required: true },
  { name: 'variant', type: "'primary' | 'secondary' | 'danger' | 'ghost'", default: "'secondary'", description: 'Maps onto BaseButton variants.' },
  { name: 'ariaLabel', type: 'string', default: '= label', description: 'Accessible name when the label alone is ambiguous.' },
  { name: 'run', type: '(notificationId: string) => void | Promise<void>', description: 'Handler; resolve dismisses, reject surfaces an error card.', required: true },
];

const PROMISE_ROWS: DocRow[] = [
  { name: 'loading', type: 'string', description: 'Title for the sticky loading card.', required: true },
  { name: 'success', type: 'string | (data: T) => string', description: 'Title applied when the promise resolves.', required: true },
  { name: 'error', type: 'string | (err: unknown) => string', description: 'Title applied when the promise rejects.', required: true },
  { name: 'description.loading', type: 'string', default: '—', description: 'Optional body copy for the loading phase.' },
  { name: 'description.success', type: 'string | (data: T) => string', default: '—', description: 'Optional body copy for the success phase.' },
  { name: 'description.error', type: 'string | (err: unknown) => string', default: '—', description: 'Optional body copy for the failure phase.' },
];

const SOUND_ROWS: DocRow[] = [
  { name: 'success', type: 'D5 587.33Hz → A5 880Hz', description: 'Ascending dual-tone, 80ms + 120ms.' },
  { name: 'error', type: 'A3 220Hz + Bb3 233.08Hz', description: 'Simultaneous blend producing a warning beat, 180ms.' },
  { name: 'warning', type: 'Bb4 466.16Hz ×2', description: 'Double blip at 0ms and 130ms.' },
  { name: 'info / default', type: 'C5 523.25Hz', description: 'Single pure chime, 100ms with smooth decay.' },
  { name: 'loading', type: 'silent', description: 'Persistent spinners never beep.' },
];

const STORE_API_ROWS: DocRow[] = [
  { name: 'notifications', type: 'Ref<NotificationItem[]>', description: 'Live array; newest last.', required: true },
  { name: 'notify', type: '(input) => string', description: 'Push a notification; also exposes notify.promise().', required: true },
  { name: 'byPosition', type: 'ComputedRef<Record<Position, Item[]>>', description: 'Grouped, newest first per anchor.', required: true },
  { name: 'activeCount', type: 'ComputedRef<number>', description: 'Live count excluding exiting cards.', required: true },
  { name: 'isMuted', type: 'Ref<boolean>', description: 'Master sound switch shared with the audio engine.', required: true },
];

const STORE_METHOD_ROWS: DocRow[] = [
  { name: 'updateNotification(id, patch)', type: 'void', description: 'Patches an item and reconciles its ticker (0 → positive re-arms).' },
  { name: 'dismiss(id)', type: 'void', description: 'Idempotent: logs history once, animates out, then splices.' },
  { name: 'dismissAll()', type: 'void', description: 'Dismisses everything, including non-dismissible cards.' },
  { name: 'dismissPosition(position)', type: 'void', description: 'Clears a single anchor.' },
  { name: 'pause(id) / resume(id)', type: 'void', description: 'Exact-time freeze and re-arm for one card.' },
  { name: 'pauseAll() / resumeAll()', type: 'void', description: 'Bulk freeze and re-arm.' },
  { name: 'createNotification(input)', type: 'NotificationItem', description: 'Canonical factory with clamping and validation.' },
  { name: 'setMuted(flag) / toggleMuted()', type: 'void | boolean', description: 'Global audio control.' },
  { name: 'dispose()', type: 'void', description: 'Releases global listeners on the final consumer.' },
];

const ITEM_SCHEMA_ROWS: DocRow[] = [
  { name: 'id', type: 'string', description: 'UUID v4 from crypto.randomUUID with a CSPRNG fallback.', required: true },
  { name: 'type', type: 'NotificationType', description: 'Drives icon, accent, chime and urgency.', required: true },
  { name: 'title', type: 'string', description: 'Headline copy.', required: true },
  { name: 'description', type: 'string | undefined', description: 'Optional supporting copy.' },
  { name: 'duration', type: 'number', description: 'Lifetime in ms; 0 = persistent.', required: true },
  { name: 'position', type: 'NotificationPosition', description: 'Resolved anchor.', required: true },
  { name: 'createdAt', type: 'number', description: 'Wall-clock epoch ms used for history attribution.', required: true },
  { name: 'actions', type: 'NotificationAction[]', description: 'Sanitized action list.', required: true },
  { name: 'remainingTime', type: 'number', description: 'Live countdown; 0 for persistent cards.', required: true },
  { name: 'timerStartedAt', type: 'number', description: 'Monotonic stamp of the current countdown segment.', required: true },
  { name: 'triggerSource', type: "'playground' | 'api' | 'user-action'", description: 'Recorded on dismissal.', required: true },
];

const BREAKPOINT_ROWS: DocRow[] = BREAKPOINT_MATRIX.map((band) => ({
  name: band.label,
  type: band.range,
  description: `${band.navigation}. ${band.toasts}. ${band.interaction}.`,
}));

const COLOR_TOKENS = [
  { name: '--color-notify-info', usage: 'Informational cards and badges', swatch: 'bg-notify-info' },
  { name: '--color-notify-success', usage: 'Resolved promise toasts', swatch: 'bg-notify-success' },
  { name: '--color-notify-warning', usage: 'Non-blocking warnings', swatch: 'bg-notify-warning' },
  { name: '--color-notify-error', usage: 'Failures and urgent alerts', swatch: 'bg-notify-error' },
  { name: '--color-notify-loading', usage: 'Sticky loading placeholders', swatch: 'bg-notify-loading' },
  { name: '--color-notify-neutral', usage: 'Default and informational chrome', swatch: 'bg-notify-neutral' },
] as const;

const ACCESSIBILITY_NOTES = [
  {
    title: 'Live regions with correct urgency',
    detail: 'Success and info cards render as role="status" (polite); errors and warnings as role="alert" (assertive), so screen readers interrupt only when it matters.',
  },
  {
    title: 'Keyboard parity',
    detail: 'Escape dismisses the newest dismissible toast (or the focused one), every action button is reachable by Tab, and focus is never trapped in a card.',
  },
  {
    title: '44px touch targets',
    detail: 'Buttons, switches, close controls and navigation links keep a hard 44×44px minimum; action rows maintain an 8px gap so hitboxes never collide.',
  },
  {
    title: 'Motion and contrast',
    detail: 'prefers-reduced-motion collapses animation durations to ~0ms, and every surface is themed for both light and dark color schemes with visible focus rings.',
  },
  {
    title: 'Progress is decorative',
    detail: 'The countdown meter is aria-hidden because a per-frame progressbar would flood assistive tech; the card announces its content once instead.',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Reserve sticky toasts for work in progress',
    detail: 'duration: 0 cards never auto-dismiss and are protected from queue eviction. Use them for promises, then let the bridge re-arm the timer.',
  },
  {
    title: 'Do not stack more than five per anchor',
    detail: 'The store evicts the oldest auto-dismissing card synchronously when a sixth arrives, keeping each anchor readable.',
  },
  {
    title: 'Reach for the promise bridge instead of hand-rolled updates',
    detail: 'It handles the loading → success/error swap, the timer re-arm and the rejection path, and it returns the original promise so you can keep chaining.',
  },
  {
    title: 'Let history do the archaeology',
    detail: 'Dismissals are logged with their origin, so a compact toast never hides information — the drawer keeps the full record.',
  },
];
</script>
