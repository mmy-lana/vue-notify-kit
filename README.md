# vue-notify-kit

A headless, zero-dependency flash notification system, component kit, and interactive workbench built with Vue 3 and Tailwind CSS.

[Live Demo & Interactive Workbench](https://vue-notify-kit.vercel.app/) | [GitHub Repository](https://github.com/mmy-lana/vue-notify-kit)

---

### Architecture Notice: In-Repo Reference Implementation

`vue-notify-kit` is designed as an **in-repo reference architecture** (shadcn-style copy-paste primitives), **not an installable package on the public NPM registry**. 

Do not run `npm install vue-notify-kit` or `pnpm add vue-notify-kit`. To integrate this service into your application, copy the primitives directly into your codebase.

---

## Why vue-notify-kit?

Most notification libraries rely on bloated bundles, external static `.mp3` assets, sloppy `setTimeout` timers that desynchronize in background tabs, or unconstrained mobile stacks that flood small viewports.

`vue-notify-kit` provides a hardened, Tier-1 enterprise architecture:

- **Zero Asset Dependencies**: Alert chimes are synthesized algorithmically at runtime using the native Web Audio API (sine-wave frequency sweeps). No audio files, network requests, or asset loaders.
- **Precision rAF Countdown Engine**: Timers derive `remainingTime` via `requestAnimationFrame` and `performance.now()`. Countdowns stay accurate across throttled background tabs, and pause/resume states are exact.
- **Hardware-Accelerated Mobile Gestures**: Touch handling binds imperatively with `{ passive: false }` to cancel vertical scroll conflicts only when horizontal swipe dominance is confirmed.
- **Defensive State & Concurrency**:
  - Dual-layer in-flight action locks prevent rapid double-tap race conditions on asynchronous notification actions.
  - Automatic credential and token redaction (JWT, bearer tokens, API keys, card numbers) on JSON history exports.
  - Prototype pollution guards for all local storage hydration pathways.
  - Safe epoch parsing protecting against out-of-range timestamp exceptions.
- **Responsive Normalization Matrix**: Six viewport anchors automatically normalize to centered top or bottom stacks below 768px, ensuring thumb accessibility and preventing off-screen clippings.
- **Stack Eviction & Card Deck Physics**: Supports expanded, stacked (scale and offset decrement), and condensed display modes with strict synchronous eviction policies.

---

## Quick Integration

### 1. Copy Primitives to Your Project

Clone the repository and copy the core modules into your project structure:

```bash
# Clone the repository
git clone https://github.com/mmy-lana/vue-notify-kit.git

# Copy primitives into your Vue 3 project
mkdir -p src/composables src/components/molecules src/components/organisms src/components/ui src/utils src/types
cp vue-notify-kit/src/composables/useNotify.ts            src/composables/
cp vue-notify-kit/src/composables/useNotifyStorage.ts     src/composables/
cp vue-notify-kit/src/composables/useSwipeDismiss.ts      src/composables/
cp vue-notify-kit/src/composables/useNotificationSound.ts src/composables/
cp -r vue-notify-kit/src/components/molecules/*           src/components/molecules/
cp -r vue-notify-kit/src/components/organisms/*           src/components/organisms/
cp -r vue-notify-kit/src/components/ui/*                  src/components/ui/
cp -r vue-notify-kit/src/utils/*                          src/utils/
cp -r vue-notify-kit/src/types/*                          src/types/
```

### 2. Mount the Global Viewport

Mount `ToastContainer` near the root of your application (e.g., `App.vue`):

```vue
<script setup lang="ts">
import ToastContainer from '@/components/organisms/ToastContainer.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <RouterView />
    <!-- Global Toast Viewport -->
    <ToastContainer />
  </div>
</template>
```

### 3. Trigger Notifications Anywhere

`useNotify` is a singleton composable. Trigger alerts from setup scripts, Pinia stores, or standalone utility modules:

```typescript
import { useNotify } from '@/composables/useNotify';

const { notify } = useNotify();

// Standard notification
const id = notify({
  type: 'success',
  title: 'Deployment Successful',
  description: 'Version 2.4.0 shipped to production in 38s.',
  position: 'top-right',
  duration: 4000,
  sound: true,
  actions: [
    {
      id: 'view',
      label: 'View Release',
      variant: 'primary',
      run: async (notificationId) => {
        console.log('Action triggered for', notificationId);
      },
    },
  ],
});
```

---

## Key Features & APIs

### Promise Bridge (`notify.promise`)

Converts any asynchronous workflow into an uninterrupted loading -> success/error state transition. Automatically re-arms the auto-dismiss timer when the promise settles:

```typescript
const { notify } = useNotify();

await notify.promise(
  () => api.deploy({ release: 'v2.4.0' }),
  {
    loading: 'Deploying release artifacts...',
    success: (data) => `Deployed ${data.release} successfully`,
    error: (err) => (err instanceof Error ? err.message : 'Deployment failed'),
    description: {
      loading: 'Writing containers and configuring routing rules.',
      success: 'All cluster nodes report healthy status.',
    },
  },
);
```

### Programmatic Control Surface

| Method | Parameters | Description |
| :--- | :--- | :--- |
| `notify(input)` | `CreateNotificationInput` | Pushes an alert; returns its UUID. |
| `notify.promise(fn, msgs)` | `Promise, Messages` | Handles loading-to-settled promise pipelines. |
| `updateNotification(id, patch)` | `string, Partial<Item>` | Patches fields in place; transitions 0 -> positive re-arm timers. |
| `dismiss(id, immediate?)` | `string, boolean` | Executes exit animation and cleans up state. |
| `dismissAll()` | None | Evicts all active alerts across all anchors. |
| `dismissPosition(pos)` | `NotificationPosition` | Clears all alerts anchored in a specific zone. |
| `pause(id) / resume(id)` | `string` | Freezes or resumes countdown timers at millisecond accuracy. |
| `toggleMuted()` | None | Globally flips the synthesized Web Audio chime switch. |

---

## Design Tokens & Theming

Designed for modern Tailwind CSS (v4 `@theme` architecture). Configure tokens directly in your global stylesheet (`src/assets/styles/main.css`):

```css
@import "tailwindcss";

@theme {
  --color-notify-info: #0284c7;
  --color-notify-success: #16a34a;
  --color-notify-warning: #d97706;
  --color-notify-error: #dc2626;
  --color-notify-loading: #7c3aed;
  --color-notify-neutral: #475569;

  --z-toast: 9999;
  --z-drawer-panel: 9100;
  --z-drawer-nav: 9000;
}
```

---

## Responsive Viewport Matrix

| Viewport Band | Width Range | Anchor Normalization | Touch & Interaction Constraints |
| :--- | :--- | :--- | :--- |
| **Mobile XS** | 360px - 389px | Forced `top-center` / `bottom-center` | 44px min tap targets; horizontal swipe-to-dismiss active. |
| **Mobile Standard** | 390px - 429px | Forced `top-center` / `bottom-center` | Tap-and-hold pauses timers; gutters set to 12px. |
| **Tablet** | 768px - 1023px | Exact corner positions respected | Dual pointer support: touch swipes and cursor hover pausing. |
| **Desktop** | 1024px+ | Full 6-anchor positioning grid | Desktop hover pause; `Esc` key dismisses newest alert. |

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/mmy-lana/vue-notify-kit.git
cd vue-notify-kit

# Install dependencies using pnpm
pnpm install

# Start the interactive workbench
pnpm run dev

# Run type checks and build for production
pnpm run build
```

---

## License

MIT License. Free for personal and commercial usage.
