<template>
  <DocLayout>
    <RouterView />
  </DocLayout>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';

import DocLayout from '@/layouts/DocLayout.vue';
</script>
