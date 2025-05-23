<template>
  <button
    :type="type"
    :class="buttonClasses"
    @click="handleClick"
    v-tooltip="tooltipValue"
  >
    <span v-if="icon" :class="['w-4 h-4 shrink-0', icon]"></span>
    <span v-if="slots.default" class="truncate">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

// Define Props
interface TooltipOptions {
  content: string; // Assuming a simple string content for now
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right'; // Example placements
  // Add other tippy.js Props if needed
}

const props = defineProps<{
  type?: 'button' | 'submit'
  isFull?: boolean
  tooltip?: TooltipOptions | string // Can be a string or an object for more complex tooltips
  isActive?: boolean
  icon?: string
}>()

// Define Emits
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const slots = useSlots()

// Computed property for dynamic classes
const buttonClasses = computed(() => {
  // The 'class' prop from the parent will be automatically merged.
  // We only need to define the classes applied by this component's logic.
  return [
    'inline-flex whitespace-nowrap items-center justify-center h-6 rounded-lg cursor active:ring-2 ring-blue-500 space-x-1',
    {
      'px-2': !!slots.default, // Check if default slot has content
      'w-6': !slots.default,
      'w-full': props.isFull,
      'bg-blue-500 text-white': props.isActive,
      'hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-zinc-600': !props.isActive,
      // 'hint--bottom hint--rounded hint--no-animate': !!props.tooltip, // This was for tippy.js, handle tooltip differently
    },
  ]
})

const tooltipValue = computed(() => {
  if (!props.tooltip) return undefined; // No tooltip if prop is not provided
  if (typeof props.tooltip === 'string') {
    return props.tooltip; // Pass string directly
  }
  // If it's an object, pass it (it should match Tippy.js options or the directive's expected structure)
  return props.tooltip; 
})

// Handle Click
const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style scoped>
/* Scoped styles for the button can go here if needed */
/* Most styling seems to be utility-class based from the original */
</style>
