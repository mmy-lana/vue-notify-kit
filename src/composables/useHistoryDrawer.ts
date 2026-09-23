/**
 * Shared open/closed state for the notification history drawer.
 *
 * The drawer is mounted once by `DocLayout`, while the triggers live in the
 * header and inside the playground workbench, so the state has to be shared
 * rather than lifted through every layer.
 */

import { ref, type Ref } from 'vue';

export interface HistoryDrawerApi {
  /** Whether the drawer is currently visible. */
  readonly isOpen: Ref<boolean>;
  /** Opens the drawer. */
  open(): void;
  /** Closes the drawer. */
  close(): void;
  /** Flips the drawer. */
  toggle(): void;
}

const isOpen = ref(false);

const api: HistoryDrawerApi = {
  isOpen,
  open(): void {
    isOpen.value = true;
  },
  close(): void {
    isOpen.value = false;
  },
  toggle(): void {
    isOpen.value = !isOpen.value;
  },
};

/** Accesses the shared history drawer controller. */
export function useHistoryDrawer(): HistoryDrawerApi {
  return api;
}
