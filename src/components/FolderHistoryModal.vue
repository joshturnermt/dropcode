<template>
  <PromptModal
    :is-open="isOpen"
    :items="folderItems"
    :keyword="keyword"
    @update:keyword="setKeyword"
    placeholder="Filter previously opened folders or open another"
    @close="handleClose"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { dialog } from '@tauri-apps/api'
import { useAppStore } from '../stores/app'
import PromptModal from './PromptModal.vue'

interface Item {
  id: string; // For keying
  text: string
  onClick: () => void
  icon?: string
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const appStore = useAppStore()
const router = useRouter()
const keyword = ref('')

const setKeyword = (value: string) => {
  keyword.value = value
}

const openAnotherFolder = async () => {
  try {
    const result = await dialog.open({
      directory: true,
      multiple: false,
      // defaultPath: await path.homeDir(), // Consider adding a default path
    })
    if (typeof result === 'string') {
      // User selected a folder
      await appStore.loadFolder(result) // Load the folder (adds to history, sets current)
      router.push({ path: '/snippets', query: { folder: result } }) // Navigate
      handleClose()
    } else {
      // User cancelled or selected multiple (if multiple were allowed)
    }
  } catch (err) {
    console.error('Error opening folder dialog:', err)
    // Optionally, show an error message to the user
    await dialog.message(`Error opening folder: ${err}`, { type: 'error', title: 'Error' });
  }
}

const folderItems = computed<Item[]>(() => {
  const lowerKeyword = keyword.value.toLowerCase()
  const historyItems = appStore.app.folders
    .filter((folder) =>
      lowerKeyword ? folder.toLowerCase().includes(lowerKeyword) : true
    )
    .map<Item>((folder) => ({
      id: folder, // Use folder path as ID
      icon: 'i-bi:folder', // Ensure these icons are available or use alternatives
      text: folder,
      onClick: () => {
        // No need to call appStore.loadFolder here if navigation triggers it
        // or if it's expected to be loaded already.
        // If navigation to /snippets with folder query param handles loading, this is fine.
        router.push({ path: '/snippets', query: { folder } })
        handleClose()
      },
    }))

  return [
    ...historyItems,
    {
      id: 'open-another-folder',
      icon: 'i-bi:folder-plus',
      text: 'Open another folder...',
      onClick: async () => {
        await openAnotherFolder()
        // openAnotherFolder handles close and navigation on success
      },
    },
  ]
})

const handleClose = () => {
  setKeyword('') // Reset keyword
  emit('close')
}
</script>
