<template>
  <BaseModal :is-open="isOpen" @close="handleClose">
    <div class="p-5 vscode-snippet-settings-modal">
      <div class="text-lg font-medium mb-5">
        Make this snippet compatible with
        <a
          href="https://code.visualstudio.com/docs/editor/userdefinedsnippets"
          target="_blank"
          class="text-blue-500 hover:underline"
        >
          VSCode Snippets
        </a>
      </div>
      <form v-if="currentSnippet" @submit.prevent="handleSubmit">
        <label>
          <span class="block mb-1 font-medium">Prefix</span>
          <div class="text-xs text-zinc-400 dark:text-zinc-500 mb-2">
            One or more trigger words that display the snippet in IntelliSense. Separated by comma.
          </div>
          <input
            v-model="prefix"
            spellcheck="false"
            class="input w-full bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 focus:ring focus:border-blue-500"
            autofocus 
          />
        </label>
        <div class="mt-5 space-x-2 flex justify-end">
          <button
            type="button"
            @click="handleClose"
            class="btn-secondary cursor-pointer border bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 active:border-zinc-200 active:bg-zinc-200 dark:active:border-zinc-600 dark:active:bg-zinc-600 rounded-lg px-3 inline-flex h-8 items-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary cursor-pointer border bg-blue-500 text-white hover:bg-blue-600 active:border-blue-700 active:bg-blue-700 rounded-lg px-3 inline-flex h-8 items-center"
          >
            Save
          </button>
        </div>
      </form>
      <div v-else class="text-zinc-500">
        Snippet not found or not selected.
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { useAppStore, type Snippet } from '../stores/app' // Ensure Snippet type is exported or defined

const props = defineProps<{
  isOpen: boolean
  snippetId?: string // Snippet ID can be undefined if no snippet is selected
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const appStore = useAppStore()
const prefix = ref('')

const currentSnippet = computed<Snippet | undefined>(() => {
  return props.snippetId ? appStore.snippets.find(s => s.id === props.snippetId) : undefined
})

watch(() => props.isOpen, (newVal) => {
  if (newVal && currentSnippet.value) {
    prefix.value = currentSnippet.value.vscodeSnippet?.prefix || ''
  } else if (!newVal) {
    // Reset prefix when modal is closed, if desired
    // prefix.value = ''; 
  }
}, { immediate: true })

// Also watch currentSnippet if snippetId can change while modal is open
watch(currentSnippet, (newSnippet) => {
  if (props.isOpen && newSnippet) {
    prefix.value = newSnippet.vscodeSnippet?.prefix || ''
  }
})


const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!currentSnippet.value) return

  await appStore.updateSnippet(currentSnippet.value.id, 'vscodeSnippet', {
    ...(currentSnippet.value.vscodeSnippet || {}), // Preserve other potential vscodeSnippet properties
    prefix: prefix.value.trim(),
  })
  handleClose()
}
</script>

<style scoped>
/* Add any specific styles for VSCodeSnippetSettingsModal if needed */
.input { /* Basic input styling, can be enhanced */
  outline: none;
}
</style>
