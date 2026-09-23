import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'playground',
    component: () => import('@/views/PlaygroundView.vue'),
  },
  {
    path: '/docs',
    name: 'documentation',
    component: () => import('@/views/DocumentationView.vue'),
  },
  {
    // Unknown deep links fall back to the playground instead of a blank page.
    // A string redirect avoids passing `pathMatch` to a route that has no such
    // param (which vue-router warns about).
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  /**
   * Restores the previous scroll position on back/forward, and otherwise honours
   * in-page anchors (`/docs#promises`) so sidebar links land on their section.
   */
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition !== null && savedPosition !== undefined) {
      return savedPosition;
    }

    if (to.hash.length > 0) {
      return { el: to.hash, top: 80, behavior: 'smooth' };
    }

    return { top: 0 };
  },
});

export default router;
