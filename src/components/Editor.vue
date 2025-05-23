<template>
  <div ref="editorRef" class="cm-editor-container h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { placeholder as cmPlaceholder } from '@codemirror/view'

// Language imports - these might need to be dynamically imported for better chunking
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'

// TODO: Add more languages as needed from the original project's lib/languages.ts
// This is a simplified mapping for now.
const languageMap: Record<string, () => Extension> = {
  javascript: () => javascript(),
  jsx: () => javascript({ jsx: true }),
  typescript: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  html: () => html(),
  css: () => css(),
  python: () => python(),
  markdown: () => markdown(),
  json: () => json(),
  cpp: () => cpp(),
  java: () => java(),
  php: () => php(),
  rust: () => rust(),
  sql: () => sql(),
  xml: () => xml(),
  // default or text
  plaintext: () => [], 
}

const props = defineProps<{
  modelValue: string
  language?: string
  readonly?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)

const languageCompartment = new Compartment()
const readonlyCompartment = new Compartment()
const themeCompartment = new Compartment()
const placeholderCompartment = new Compartment()

const getLanguageExtension = (langName?: string): Extension => {
  const lang = langName?.toLowerCase() || 'plaintext'
  const langLoader = languageMap[lang] || languageMap.plaintext
  return langLoader()
}

const isDarkMode = ref(document.documentElement.classList.contains('dark'))
// TODO: Consider a more robust way to track dark mode, e.g., a store or MutationObserver

// Observe dark mode changes
let observer: MutationObserver | null = null;
onMounted(() => {
  observer = new MutationObserver(() => {
    const newIsDarkMode = document.documentElement.classList.contains('dark');
    if (newIsDarkMode !== isDarkMode.value) {
      isDarkMode.value = newIsDarkMode;
      if (editorView.value) {
        editorView.value.dispatch({
          effects: themeCompartment.reconfigure(isDarkMode.value ? githubDark : githubLight)
        });
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});


onMounted(() => {
  if (!editorRef.value) return

  const extensions: Extension[] = [
    basicSetup,
    EditorView.lineWrapping,
    keymap.of([
      indentWithTab, // Default Tab behavior
      {
        key: 'Mod-s', // Ctrl+S or Cmd+S
        run: () => {
          emit('save')
          return true // Mark as handled
        },
      },
    ]),
    languageCompartment.of(getLanguageExtension(props.language)),
    readonlyCompartment.of(EditorView.editable.of(!props.readonly)),
    themeCompartment.of(isDarkMode.value ? githubDark : githubLight),
    placeholderCompartment.of(props.placeholder ? cmPlaceholder(props.placeholder) : []),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString()
        // Check to prevent emitting update if the change came from props.modelValue watcher
        if (newValue !== props.modelValue) {
          emit('update:modelValue', newValue)
        }
      }
    }),
  ]

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions,
  })

  const view = new EditorView({
    state: startState,
    parent: editorRef.value,
  })
  editorView.value = view
})

onUnmounted(() => {
  editorView.value?.destroy()
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (editorView.value && newValue !== editorView.value.state.doc.toString()) {
    editorView.value.dispatch({
      changes: { from: 0, to: editorView.value.state.doc.length, insert: newValue },
    })
  }
})

// Watch for language changes
watch(() => props.language, (newLang) => {
  if (editorView.value) {
    editorView.value.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(newLang)),
    })
  }
})

// Watch for readonly changes
watch(() => props.readonly, (newReadonly) => {
  if (editorView.value) {
    editorView.value.dispatch({
      effects: readonlyCompartment.reconfigure(EditorView.editable.of(!newReadonly)),
    })
  }
})

// Watch for placeholder changes
watch(() => props.placeholder, (newPlaceholder) => {
  if (editorView.value) {
    editorView.value.dispatch({
      effects: placeholderCompartment.reconfigure(newPlaceholder ? cmPlaceholder(newPlaceholder) : []),
    })
  }
})

</script>

<style>
.cm-editor-container .cm-editor {
  height: 100%;
  outline: none !important; /* Ensure no outline on the editor itself if not desired */
}
.cm-editor-container .cm-scroller {
  overflow: auto;
}
/* Placeholder styling */
.cm-placeholder { 
  color: #888; /* Or your preferred placeholder color */
  font-style: italic;
}
</style>
