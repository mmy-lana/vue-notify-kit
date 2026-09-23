# Technical Specification & Architecture Plan: vue-notify-kit

## 1. Data Schema & Pure TypeScript Interfaces

```typescript
// types/notify.ts
// ARCHITECTURAL RULE: types/notify.ts must have zero imports from components or composables.

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'loading' 
  | 'default';

export type NotificationPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export type StackingMode = 'expanded' | 'stacked' | 'condensed';

export interface NotificationAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  ariaLabel?: string;
  run: (notificationId: string) => void | Promise<void>;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration: number; // In milliseconds; 0 indicates persistent (no auto-dismiss)
  position: NotificationPosition;
  createdAt: number;
  dismissible: boolean;
  showProgress: boolean;
  pauseOnHover: boolean;
  pauseOnFocusLoss: boolean;
  sound: boolean;
  customClass?: string;
  actions: NotificationAction[];
  remainingTime: number;
  isPaused: boolean;
  timerStartedAt: number;
  triggerSource: 'playground' | 'api' | 'user-action';
  isDismissing: boolean;
}

export type CreateNotificationInput = Partial<Omit<NotificationItem, 'id' | 'createdAt' | 'remainingTime' | 'isPaused' | 'timerStartedAt' | 'isDismissing'>> & {
  title: string;
};

export type NotificationFactory = (input: CreateNotificationInput) => NotificationItem;

export interface PromiseNotificationMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
  description?: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
  };
}

export interface NotificationHistoryRecord {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  timestamp: number;
  dismissedAt: number;
  triggerSource: 'playground' | 'api' | 'user-action';
}

export interface PlaygroundConfiguration {
  type: NotificationType;
  title: string;
  description: string;
  position: NotificationPosition;
  duration: number;
  showProgress: boolean;
  dismissible: boolean;
  pauseOnHover: boolean;
  sound: boolean;
  stackingMode: StackingMode;
  hasPrimaryAction: boolean;
  hasSecondaryAction: boolean;
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

export interface DocNavigationSection {
  id: string;
  title: string;
  items: Array<{
    id: string;
    title: string;
    path: string;
    badge?: string;
  }>;
}

export interface StorageSchema {
  vue_notify_history: NotificationHistoryRecord[];
  vue_notify_playground_config: PlaygroundConfiguration;
  vue_notify_color_theme: 'system' | 'light' | 'dark';
}
```

---

## 2. Component Architecture

### Atomic UI Primitives (`src/components/ui/`)
- `BaseButton.vue`: Native `<button>` wrapper supporting semantic variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`xs`, `sm`, `md`, `lg`), loading spinner indicator, and keyboard focus rings. For mobile touch compliance, tap targets enforce a hard floor of `min-h-[44px] min-w-[44px]` via direct layout dimensions or flex padding (avoiding unbounded pseudo-element overlaps). All action button groups in `ToastItem.vue` enforce a mandatory `gap-2` (minimum 8px) to prevent hitbox collision.
- `BaseInput.vue`: High-contrast accessible text input with label binding, placeholder, hint, and error message styling. Uses Vue 3 `defineModel()`.
- `BaseSelect.vue`: Accessible dropdown selector for single-choice configuration (`position`, `type`, `stackingMode`). Uses Vue 3 `defineModel()`.
- `BaseSwitch.vue`: Semantic toggle switch (`role="switch"`) with `aria-checked` bindings for boolean states. Uses Vue 3 `defineModel()`.
- `BaseSlider.vue`: Range slider control for numeric fine-tuning (notification durations from 0ms to 15000ms). Uses Vue 3 `defineModel()`.
- `BaseBadge.vue`: Type and status indicators with contextual background/border styles matching notification types.
- `BaseIcon.vue`: Pure SVG vector icon registry. Renders inline icons for `CheckCircle`, `AlertTriangle`, `AlertOctagon`, `Info`, `Loader`, `X`, `Copy`, `Check`, `Volume2`, `VolumeX`, `Terminal`, `ExternalLink`, and `Sliders`.

### Compound Molecules (`src/components/molecules/`)
- `ToastItem.vue`: Single toast card instance supporting swipe-to-dismiss gesture tracking, manual close button, action triggers, pause/resume listeners, and dynamic icon rendering. Action triggers and close targets maintain mandatory 44px hitboxes.
- `ToastProgressBar.vue`: High-performance CSS transform-based progress meter calculated against `remainingTime` and total `duration`.
- `CodeSnippetViewer.vue`: Monospaced syntax display with one-click copy to clipboard, dynamic framework code generation based on playground state, and temporary copied feedback state. Container enforces `overflow-x-auto` and `white-space: pre` to prevent viewport breakages on mobile.
- `PropsTable.vue`: Responsive data grid presenting API schema, types, default values, and operational descriptions for library documentation. Enclosed in an `overflow-x-auto` container with min-width constraints, transforming into stacked cards under 480px.
- `PlaygroundControlGroup.vue`: Collapsible section wrapper grouping relevant playground parameters (Payload, Timers, Layout, Actions).

### Domain Features & Organisms (`src/components/organisms/`)
- `ToastContainer.vue`: Viewport portal mounted to document root. Dynamically maps configured positions to an `effectivePosition` computed property (`<768px` automatically normalizes to `bottom-center` or `top-center`). Positions items via `<TransitionGroup>` matching entry/exit trajectories to `effectivePosition`.
- `PlaygroundWorkbench.vue`: Interactive split-pane interface containing the real-time configurator form, live trigger triggers, interactive payload inspector, and generated code snippet.
- `NotificationHistoryDrawer.vue`: Off-canvas slide-out sheet (`z-drawer-panel: 9100`) displaying chronological event logs. Mutually exclusive with `DocSidebar` navigation on mobile viewports.
- `DocSidebar.vue`: Collapsible hierarchical navigation tree with mobile drawer backdrop (`z-drawer-nav: 9000`). Mutually exclusive with `NotificationHistoryDrawer` on mobile viewports.
- `DocHeader.vue`: Global utility bar containing library branding, search dialog trigger, repository links, and dark/light color scheme toggle.

### Page Assembly & Layout Shell (`src/layouts/` and `src/views/`)
- `DocLayout.vue`: Responsive documentation layout framework:
  - Mobile (<768px): Header with hamburger menu trigger, floating quick-launch actions bar.
  - Tablet (768px - 1023px): Collapsible icon-and-text sidebar, fluid content container.
  - Desktop (1024px+): Fixed 280px left sidebar, fluid center reading/playground area, sticky 220px right-hand table of contents.
- `PlaygroundView.vue`: Master view orchestrating interactive testing, preset loaders, and performance metrics.
- `DocumentationView.vue`: Structured markdown-rendered guide for installation, basic usage, custom rendering, and programmatic APIs.

---

## 3. Core Feature Logic

### 3.1. Notification Store & Queue Engine (`src/composables/useNotify.ts`)
1. **State Store Structure & Explicit API**:
   - Central reactive array `notifications = ref<NotificationItem[]>([])`.
   - Global defaults: `duration = 4000`, `position = 'top-right'`, `dismissible = true`, `pauseOnHover = true`, `showProgress = true`, `sound = false`.
   - Public store API contracts:
     - `notify(input: CreateNotificationInput): string`
     - `updateNotification(id: string, patch: Partial<NotificationItem>): void`
     - `dismiss(id: string): void`
     - `dismissAll(): void`
     - `createNotification(input: CreateNotificationInput): NotificationItem` (Canonical factory)
2. **Push Pipeline & Synchronous Eviction**:
   - Validate and clamp durations: `duration = Math.max(0, input.duration ?? defaultDuration)`.
   - Canonical factory creates complete `NotificationItem` ensuring non-null `timerStartedAt = performance.now()`, `remainingTime = duration`, `isDismissing = false`, and default `triggerSource = input.triggerSource ?? 'api'`.
   - Synchronous stack eviction: Query the live `notifications.value` array directly inside `push()`. If the count of matching `position` items >= 5, synchronously splice out the oldest non-sticky item before pushing the new item to prevent concurrent-tick overpopulation.
   - Dispatch audio chime if `sound: true`.
3. **Timer Management & Loop Teardown**:
   - Do not rely on plain `setTimeout` alone. Use active timestamp diffing via `requestAnimationFrame` loop to calculate `remainingTime = targetTime - performance.now()`.
   - Each item tracks its own rAF handle `rafHandle: number | null`.
   - On `pointerenter` (desktop hover) or `touchstart` (mobile hold): Set `isPaused = true`, cancel existing rAF loop via `cancelAnimationFrame(handle)`.
   - On `pointerleave` or `touchend`: Cancel any lingering rAF handle, set `isPaused = false`, recalculate `targetTime = performance.now() + remainingTime`, and spawn a clean rAF ticker.
4. **Promise Bridge Pipeline (`notify.promise`)**:
   - Instantaneously spawn loading toast with `type: 'loading'`, `duration: 0` (sticky), `dismissible: false`.
   - Await execution of user-supplied promise.
   - On resolution: Invoke `updateNotification(id, { type: 'success', title: resolvedTitle, duration: defaultDuration, dismissible: true, remainingTime: defaultDuration, timerStartedAt: performance.now() })`.
   - On rejection: Invoke `updateNotification(id, { type: 'error', title: errorMessage, duration: defaultDuration, dismissible: true, remainingTime: defaultDuration, timerStartedAt: performance.now() })`.
   - Timer Re-Arm: In `updateNotification`, detect transitions where `previous.duration === 0` and `patch.duration > 0`. Synchronously spawn the rAF ticker routine to prevent resolved sticky promises from remaining frozen on screen.
5. **Dismissal Protocol**:
   - Idempotency guard: Synchronously verify target existence and flag in-flight dismissal (`const target = notifications.value.find(n => n.id === id); if (!target || target.isDismissing) return; target.isDismissing = true;`). Prevents duplicate history logging and concurrent splice scheduling during the 200ms exit transition window.
   - Cancel active rAF ticker for `id`.
   - Finalize history record: Construct `NotificationHistoryRecord` where `timestamp = target.createdAt` (preserves origin creation time), `dismissedAt = Date.now()`, and `triggerSource = target.triggerSource`. Dispatch record to the debounced persistence pipeline.
   - Trigger CSS exit transition via `isDismissing` state on the item.
   - Splice notification out of reactive state after 200ms animation completion.

### 3.2. Touch-Driven Swipe-to-Dismiss Engine (`src/composables/useSwipeDismiss.ts`)
1. **Touch Registration & Explicit Non-Passive Binding**:
   - Bind `@touchstart.passive` and `@touchend` to `ToastItem`.
   - Do NOT use Vue's `.passive` template modifier on `touchmove`. Attach imperatively within `onMounted(() => element.addEventListener('touchmove', handleTouchMove, { passive: false }))` and remove in `onUnmounted` to guarantee `event.preventDefault()` can cancel vertical scroll conflicts.
   - Record `initialX = touches[0].clientX`, `initialY = touches[0].clientY`.
2. **Translation & Rubber-Banding Algorithm**:
   - Calculate `deltaX = currentX - initialX` and `deltaY = currentY - initialY`.
   - If `Math.abs(deltaX) > Math.abs(deltaY)`, call `event.preventDefault()` to lock vertical document scrolling and claim the horizontal swipe axis.
   - Apply continuous horizontal translation via direct style transformation: `transform = translateX(${deltaX}px)`.
   - Opacity decay calculation: `opacity = Math.max(0, 1 - Math.abs(deltaX) / swipeThreshold)`.
3. **Threshold & Snap Resolution**:
   - Threshold constant: `swipeThreshold = 96px` (or swipe velocity `v > 0.4px/ms`).
   - If swipe exceeds threshold in either direction:
     - Animate element off-screen along current vector (`translateX(±100vw)`).
     - Invoke `dismiss(notificationId)` upon transition completion.
   - If swipe does not meet threshold:
     - Trigger CSS spring back to `translateX(0px)` and restore `opacity = 1`.

### 3.3. Zero-Asset Synthesized Audio System (`src/composables/useNotificationSound.ts`)
1. **AudioContext Initialization**:
   - Lazy-instantiate `window.AudioContext` or `window.webkitAudioContext` on first user interaction.
2. **Frequency Chime Algorithms**:
   - *Success*: Dual-tone ascending sine wave.
     - Tone 1: 587.33 Hz (D5) for 80ms, gain envelope ramping up then down.
     - Tone 2: 880.00 Hz (A5) immediately following for 120ms with smooth exponential release.
   - *Error*: Dual-tone dissonant warning wave.
     - Tone 1: 220.00 Hz (A3) blended with 233.08 Hz (Bb3) for 180ms to create warning beat frequency.
   - *Info/Default*: Single pure chime at 523.25 Hz (C5) for 100ms with smooth decay.
3. **Mute & Graceful Degradation**:
   - Check master switch or user browser permissions before audio emission.
   - Fall back silently when audio context is blocked by browser autoplay policies.

### 3.4. Local Storage Persistence & State Hydration (`src/composables/useNotifyStorage.ts`)
1. Provide safe typed wrappers around `window.localStorage` with JSON serialization. Wrap all read and write call sites in `try/catch` to handle Safari private mode and `QuotaExceededError`.
2. Debounce storage write pipeline by 300ms to eliminate UI thread lag and storage churn during toast bursts.
3. Multi-tab synchronization: Attach `window.addEventListener('storage', ...)` to synchronize history and theme mutations across browser tabs (last-write-wins). Guard updates with an `isSyncingFromStorage` boolean flag to prevent incoming storage events from triggering the outgoing debounced persistence watcher in an infinite loop.
4. Store history items capped at 50 records via FIFO pruning.
5. Auto-save user playground configuration to reload customized states across page refreshes.

---

## 4. Responsive Breakpoint Matrix & Layout Rules

| Breakpoint | Target Screen Width | Shell Navigation | Toast Container Positioning | Touch & Interaction Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Extra Small** | 360px - 389px | Top bar only; full-screen slide menu; hidden TOC | Full-width spanning with 8px margin; forced to bottom-center or top-center regardless of preset | Touch targets >= 44px; swipe-to-dismiss active; no hover-only controls |
| **Mobile Standard** | 390px - 429px | Top bar only; full-screen slide menu; hidden TOC | Full-width spanning with 12px margin; single column stack | Swipe-to-dismiss active; taps pause timers |
| **Mobile Large / Phablet**| 430px - 767px | Compact header; drawer overlay navigation; hidden TOC | Max-width 400px; centered or right pinned with 16px margins | Touch swipe enabled; bottom sheet for history log |
| **Tablet** | 768px - 1023px | Compact collapsible sidebar; modal quick search | Max-width 380px; respects absolute corner positions | Dual pointer support (touch + cursor hover pause) |
| **Desktop / Wide** | 1024px+ | Fixed 280px left sidebar; 220px right TOC; central content | Max-width 420px; exact positional anchor zones | Full hover-pause, keyboard navigation (`Esc` dismisses active) |

---

## 5. Five-Phase Sequential Execution Queue

### Phase 1: Types, Storage/API Client Config, and Base Utilities
- Deliverables:
  - Framework Target: Vue 3 (latest stable with `defineModel()`) and Tailwind CSS (latest stable via `@theme` stylesheet directives).
  - `src/types/notify.ts`: Pure TypeScript domain definitions, configurations, and function signature interfaces. Includes `Window` augmentation for `webkitAudioContext` and zero internal imports.
  - `src/utils/factory.ts`: Canonical `createNotification(input: CreateNotificationInput): NotificationItem` factory enforcing duration clamping and default field assembly.
  - `src/utils/constants.ts`: System defaults (durations, positions, limits, local storage keys).
  - `src/utils/id.ts`: Secure UUID generator with fallback.
  - `src/composables/useNotifyStorage.ts`: SSR-safe typed local storage wrapper with 300ms debounce, try/catch error boundaries, and `storage` event listeners.
  - `src/composables/useNotificationSound.ts`: Native Web Audio API tone generator for alert chimes without external static assets.

### Phase 2: Design Foundation & Atomic UI Primitives
- Deliverables:
  - Modern Tailwind CSS styling: Configure design tokens directly in `src/assets/main.css` via `@theme` directives (semantic notification color tokens, separate z-indices: `z-toast: 9999`, `z-drawer-panel: 9100`, `z-drawer-nav: 9000`, animation timings).
  - `src/components/ui/BaseIcon.vue`: Pure SVG icon registry covering action, alert, and navigation symbols.
  - `src/components/ui/BaseButton.vue`: Button component with variants, accessible sizing, and disabled/loading states.
  - `src/components/ui/BaseInput.vue`: Structured text field with label, error display, and focus outlines.
  - `src/components/ui/BaseSelect.vue`: Standardized dropdown component.
  - `src/components/ui/BaseSwitch.vue`: Accessible toggle switch primitive.
  - `src/components/ui/BaseSlider.vue`: Numeric range slider primitive.
  - `src/components/ui/BaseBadge.vue`: Type and status badge primitive.

### Phase 3: Compound Molecules & Feature Components
- Deliverables:
  - `src/components/molecules/ToastProgressBar.vue`: GPU-accelerated horizontal bar indicating elapsed duration.
  - `src/components/molecules/ToastItem.vue`: Interactive individual notification card handling touch events, close triggers, actions, and pause states.
  - `src/composables/useSwipeDismiss.ts`: Gesture composable processing horizontal swipes with opacity fading and spring snap-back.
  - `src/components/molecules/CodeSnippetViewer.vue`: Syntax-formatted code block with dynamic snippet generation and clipboard copying.
  - `src/components/molecules/PropsTable.vue`: Tabular interface showing library prop specifications and event definitions.
  - `src/components/molecules/PlaygroundControlGroup.vue`: Collapsible section wrapper for categorized control inputs.

### Phase 4: Domain Logic, Reactive State, and Specialized APIs
- Deliverables:
  - `src/composables/useNotify.ts`: Core state store managing active toasts, promise pipelines, manual dismissals, pause/resume loops, and queue limits.
  - `src/components/organisms/ToastContainer.vue`: Viewport mounting layer grouping items into 6 position anchors using `<TransitionGroup>` with directional entrance and exit translations.
  - `src/components/organisms/PlaygroundWorkbench.vue`: Interactive visual builder uniting form controls, quick trigger actions, custom message inputs, and real-time preview outputs.
  - `src/components/organisms/NotificationHistoryDrawer.vue`: Sliding drawer listing past notifications with re-trigger and JSON export capabilities.

### Phase 5: Complete Page/Screen Assembly & Responsive Shell
- Deliverables:
  - `src/components/organisms/DocSidebar.vue`: Multi-level navigational drawer and sidebar supporting active state highlighting.
  - `src/components/organisms/DocHeader.vue`: Top navigation bar with branding, mobile menu toggle, quick actions, and theme switch.
  - `src/layouts/DocLayout.vue`: Responsive three-column layout handling mobile drawers, tablet collapsible viewports, and desktop documentation structures.
  - `src/views/PlaygroundView.vue`: Assembled interactive workbench page.
  - `src/views/DocumentationView.vue`: Complete architectural docs, code samples, API tables, and best practices.
  - Responsive audit: Strict validation across 360px, 390px, 430px, 768px, and 1024px+ viewports ensuring zero horizontal scrolling and touch target accessibility.