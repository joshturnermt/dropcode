<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { invoke } from '@tauri-apps/api'
import { useAppStore } from './stores/app'
import { useDarkMode } from './composables/useDarkMode'

// Initialize dark mode. User can toggle it later if UI is provided.
// Default preference can be 'system', 'light', or 'dark'.
useDarkMode('system') 

const appStore = useAppStore()

onMounted(async () => {
  try {
    await invoke('show_main_window')
  } catch (e) {
    console.error('Failed to show main window:', e)
  }
  
  try {
    await appStore.init()
  } catch (e) {
    console.error('Failed to initialize app store:', e)
  }
})
</script>

<style>
/* Global styles or styles for the App shell can go here */
/* Ensure your tailwind and other global CSS are imported in main.ts */
</style>
