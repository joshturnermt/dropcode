<template>
  <PromptModal
    :is-open="isOpen"
    :items="languageItems"
    :keyword="keyword"
    @update:keyword="setKeyword"
    placeholder="Select language mode"
    @close="handleClose"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PromptModal from './PromptModal.vue'
import { languages as allLanguages } from '../lib/languages' // Assuming this path is correct

interface Language {
  id: string
  name: string
  // Add other properties if they exist in your languages object
}

interface Item {
  id: string;
  text: string
  onClick: () => void
  icon?: string
}

const props = defineProps<{
  isOpen: boolean
  // setLanguage: (languageId: string) => void; // Original prop
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'set-language', languageId: string): void // New event for selecting language
}>()

const keyword = ref('')

const setKeyword = (value: string) => {
  keyword.value = value
}

const languageItems = computed<Item[]>(() => {
  const lowerKeyword = keyword.value.toLowerCase()
  return allLanguages
    .filter((lang: Language) =>
      lowerKeyword ? lang.name.toLowerCase().includes(lowerKeyword) || lang.id.toLowerCase().includes(lowerKeyword) : true
    )
    .map((lang: Language) => ({
      id: lang.id, // Use lang.id for keying if PromptModal supports it
      text: `${lang.name} (${lang.id})`,
      onClick: () => {
        // props.setLanguage(lang.id) // Call original prop
        emit('set-language', lang.id) // Emit event
        handleClose() // Close modal on selection
      },
    }))
})

const handleClose = () => {
  setKeyword('') // Reset keyword on close
  emit('close')
}
</script>
