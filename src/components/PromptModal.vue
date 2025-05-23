<template>
  <BaseModal :is-open="isOpen" @close="closeModal">
    <div class="prompt-modal">
      <label class="block px-2 py-2">
        <input
          ref="inputRef"
          :placeholder="placeholder"
          spellcheck="false"
          class="w-full bg-zinc-100 dark:bg-zinc-700 focus:ring px-1 h-6 flex items-center rounded"
          :value="keyword"
          @input="handleInput"
          @keydown="handleKeyDown"
        />
      </label>
      <div class="modal-content max-h-60 overflow-y-auto">
        <div
          v-for="(item, index) in items"
          :key="item.id || index" 
          :id="`item-${index}`"
          class="px-2 py-1 cursor-pointer flex items-center text-center space-x-1 rounded"
          :class="{
            'bg-zinc-200 dark:bg-zinc-600': selectedIndex === index,
            'hover:bg-zinc-100 dark:hover:bg-zinc-700': selectedIndex !== index,
          }"
          @click="item.onClick"
        >
          <span v-if="item.icon" :class="[item.icon, 'w-4 h-4 shrink-0']"></span>
          <span class="truncate">{{ item.text }}</span>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'

interface Item {
  id?: string; // Optional ID for keying if available
  icon?: string
  text: string
  onClick: () => void
}

const props = defineProps<{
  isOpen: boolean
  placeholder?: string
  items: Item[]
  initialSelectedIndex?: number
  keyword: string // Use v-model:keyword in parent for two-way binding
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:keyword', value: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(props.initialSelectedIndex || 0)

const closeModal = () => {
  emit('close')
  // Reset keyword if needed, or parent handles it
  // emit('update:keyword', '') 
}

const handleInput = (event: Event) => {
  emit('update:keyword', (event.target as HTMLInputElement).value)
}

const scrollItemIntoView = (index: number) => {
  nextTick(() => {
    const itemElement = document.getElementById(`item-${index}`)
    // itemElement?.scrollIntoView({ block: 'nearest' }) // Standard behavior
    // For 'scrollIntoViewIfNeeded', which is non-standard but was in original:
    if (itemElement && (itemElement as any).scrollIntoViewIfNeeded) {
       (itemElement as any).scrollIntoViewIfNeeded(false); // false for center alignment if possible
    } else if (itemElement) {
        itemElement.scrollIntoView({ block: 'nearest' });
    }
  })
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    nextTick(() => {
      inputRef.value?.focus()
      selectedIndex.value = props.initialSelectedIndex || 0 // Reset index when opened
    })
  }
})

watch(selectedIndex, (newIndex) => {
  scrollItemIntoView(newIndex)
})

watch(() => props.items, () => {
  // Reset selected index if items change and current index is out of bounds
  if (selectedIndex.value >= props.items.length) {
    selectedIndex.value = 0
  }
  // Ensure the initially selected item is visible if items load after open
  if(props.isOpen) {
    scrollItemIntoView(selectedIndex.value);
  }
}, { deep: true })


onMounted(() => {
  if (props.isOpen) {
    inputRef.value?.focus()
    scrollItemIntoView(selectedIndex.value)
  }
})

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeModal()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + props.items.length) % props.items.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const item = props.items[selectedIndex.value]
    if (item) {
      item.onClick()
      // closeModal() // Original PromptModal didn't always close on Enter, item.onClick should handle it
    }
  }
}
</script>

<style scoped>
/* Styles for PromptModal can go here if needed */
.modal-content {
  /* Ensure scrollability if content overflows */
}
</style>
