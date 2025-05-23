<template>
  <Teleport to="#modal-container">
    <div v-if="isOpen" ref="modalRef" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @mousedown.self="handleOutsideClick">
      <!-- 
        mousedown.self ensures that clicks directly on the backdrop trigger close, 
        but not clicks on the modal content that might bubble up.
      -->
      <div ref="modalContentRef" class="bg-white dark:bg-zinc-800 shadow-xl rounded-lg p-6 max-w-md w-full">
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalRef = ref<HTMLDivElement | null>(null) // For the backdrop
const modalContentRef = ref<HTMLDivElement | null>(null) // For the actual modal content box

const handleOutsideClick = (event: MouseEvent) => {
  // This event is on the backdrop, .self modifier handles it.
  // If the click is on the backdrop itself, close the modal.
   if (event.target === modalRef.value) {
    emit('close')
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscapeKey)
    // Optionally, add focus management here, e.g., focus the modalContentRef or an element within it
    // modalContentRef.value?.focus() // Requires tabindex="-1" on the div
  } else {
    document.removeEventListener('keydown', handleEscapeKey)
  }
})

onUnmounted(() => {
  // Ensure listener is cleaned up if component is unmounted while open
  document.removeEventListener('keydown', handleEscapeKey)
})

// Note: The original SolidJS Modal had a click listener on `document` to detect outside clicks.
// The Vue version above uses `@mousedown.self` on the backdrop, which is a more common Vue pattern.
// If issues arise or more complex click-outside logic is needed (e.g., handling iframes or specific nested elements),
// the document-level listener approach could be re-implemented.
</script>

<style scoped>
.modal {
  /* Basic modal styling, adjust as needed */
  /* The original used a class 'modal', which I've kept and added some basic flex centering */
}
/* Additional styling for modal content can go here or be handled by Tailwind classes passed via slot */
</style>
