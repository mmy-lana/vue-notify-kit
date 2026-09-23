import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
  ],
});

export default router;
