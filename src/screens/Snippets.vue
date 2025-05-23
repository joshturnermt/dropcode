<template>
  <div class="h-screen flex flex-col" :class="{ 'is-mac': appStore.isMac }">
    <!-- Top draggable area for macOS if not using custom titlebar -->
    <div v-if="appStore.isMac && !isCustomTitlebarUsed" class="h-6 w-full fixed top-0 left-0" data-tauri-drag-region></div>
    
    <div class="flex flex-1 h-main" :class="{'pt-6': appStore.isMac && !isCustomTitlebarUsed}">
      <!-- Sidebar -->
      <div
        class="border-r w-64 shrink-0 h-full flex flex-col bg-zinc-50 dark:bg-zinc-800"
        :class="{ 'show-search': searchType !== null }"
      >
        <div data-tauri-drag-region class="sidebar-header text-zinc-500 dark:text-zinc-300 text-xs">
          <!-- Custom drag region for whole header if not macOS or custom titlebar handles it -->
          <div v-if="!appStore.isMac || isCustomTitlebarUsed" class="h-10" data-tauri-drag-region></div>
          <div
            data-tauri-drag-region
            class="flex items-center justify-between px-2 h-10 shrink-0"
          >
            <Button
              type="button"
              @click="isFolderHistoryModalOpen = true"
              tooltip="Select folder"
              icon="i-bi:folder"
              class="-ml-[1px] max-w-[50%] truncate"
            >
              {{ currentFolderName || 'Select Folder' }}
            </Button>
            <div class="flex items-center">
              <Button
                type="button"
                icon="i-ic:outline-add"
                @click="handleNewSnippet"
                tooltip="New snippet"
              />
              <Button
                type="button"
                icon="i-material-symbols:search"
                @click="toggleSearchType('non-trash')"
                tooltip="Search snippets"
                :is-active="searchType === 'non-trash'"
              />
              <Button
                type="button"
                icon="i-iconoir:bin"
                @click="toggleSearchType('trash')"
                tooltip="Show snippets in trash"
                :is-active="searchType === 'trash'"
              />
            </div>
          </div>
          <div v-if="searchType !== null" class="px-3 pb-2">
            <div class="flex justify-between pb-1 text-xs items-center">
              <span class="text-zinc-500 dark:text-zinc-300">
                {{ searchType === 'trash' ? 'Trash' : 'Search Snippets' }}
              </span>
              <button
                v-if="searchType === 'trash'"
                type="button"
                :disabled="filteredSnippets.length === 0"
                class="btn-secondary text-xs !px-2 !h-5"
                @click="handleEmptyTrash"
              >
                Empty Trash
              </button>
            </div>
            <div>
              <input
                ref="searchInputRef"
                v-model="searchKeyword"
                spellcheck="false"
                class="h-7 w-full flex items-center px-2 border rounded-lg bg-transparent dark:bg-zinc-700 focus:ring focus:border-blue-500 ring-blue-500 focus:outline-none"
                placeholder="Type to search..."
                @keydown.esc="searchType = null"
              />
            </div>
          </div>
        </div>

        <div class="sidebar-body group/sidebar-body flex-1 overflow-y-auto custom-scrollbar scrollbar-group p-2 pt-0 space-y-1">
          <div
            v-for="snippetItem in filteredSnippets"
            :key="snippetItem.id"
            @click="selectSnippet(snippetItem.id, $event)"
            class="group text-sm px-2 block select-none rounded-lg py-1 cursor-pointer"
            :class="{
              'bg-blue-500 text-white': isSnippetActive(snippetItem.id),
              'hover:bg-zinc-200 dark:hover:bg-zinc-700': !isSnippetActive(snippetItem.id),
              'text-zinc-800 dark:text-zinc-200': !isSnippetActive(snippetItem.id),
            }"
          >
            <div class="truncate">{{ snippetItem.name }}</div>
            <div
              class="text-xs grid grid-cols-2 gap-1 mt-[1px]"
              :class="{
                'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400': !isSnippetActive(snippetItem.id),
                'text-blue-100': isSnippetActive(snippetItem.id),
              }"
            >
              <span class="truncate">{{ timeago(snippetItem.createdAt) }}</span>
              <div class="flex justify-end items-center opacity-0 group-hover/sidebar-body:opacity-100">
                <button
                  type="button"
                  v-tooltip="snippetItem.vscodeSnippet?.prefix?.trim() ? { content: snippetItem.vscodeSnippet.prefix, placement: 'top-end' } : { content: 'Set VSCode Snippet Prefix', placement: 'top-end' }"
                  class="cursor flex justify-end items-center max-w-full"
                  :class="{
                    'hover:text-white': isSnippetActive(snippetItem.id),
                    'hover:text-zinc-600 dark:hover:text-zinc-300': !isSnippetActive(snippetItem.id),
                  }"
                  @click.stop="openVSCodeSettingsModal(snippetItem.id)"
                >
                  <span v-if="snippetItem.vscodeSnippet?.prefix?.trim()" class="truncate">
                    {{ snippetItem.vscodeSnippet.prefix }}
                  </span>
                  <span v-else class="i-fluent:key-command-16-filled text-inherit"></span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="filteredSnippets.length === 0 && searchType !== null" class="text-center text-sm text-zinc-400 py-4">
            No snippets found.
          </div>
           <div v-if="filteredSnippets.length === 0 && searchType === null && !appStore.folder" class="text-center text-sm text-zinc-400 py-4">
            Open a folder to see snippets.
          </div>
           <div v-if="filteredSnippets.length === 0 && searchType === null && appStore.folder && appStore.snippets.filter(s => !s.deletedAt).length === 0" class="text-center text-sm text-zinc-400 py-4">
            No snippets yet. Click '+' to create one.
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="w-full h-full flex flex-col bg-white dark:bg-zinc-900">
        <div v-if="activeSnippet" class="flex flex-col h-full">
          <div
            data-tauri-drag-region
            class="border-b dark:border-zinc-700 flex h-mainHeader items-center px-3 justify-between space-x-3"
          >
            <input
              v-model="activeSnippetName"
              @blur="saveActiveSnippetName"
              @keydown.enter="saveActiveSnippetNameAndBlur"
              spellcheck="false"
              class="w-full h-full focus:outline-none bg-transparent text-zinc-800 dark:text-zinc-100"
            />
            <div class="flex items-center text-xs text-zinc-500 dark:text-zinc-300 space-x-1">
              <Button
                type="button"
                icon="i-majesticons:curly-braces"
                @click="isLanguageModalOpen = true"
                tooltip="Select language mode"
              >
                {{ getLanguageName(activeSnippet.language || 'plaintext') }}
              </Button>
              <div class="group relative">
                <Button icon="i-ic:baseline-more-horiz" tooltip="More options"></Button>
                <div
                  aria-label="Dropdown"
                  class="hidden absolute bg-white dark:bg-zinc-700 z-10 py-1 right-0 min-w-[160px] border dark:border-zinc-600 rounded-lg shadow-lg group-hover:block"
                >
                  <button
                    type="button"
                    class="dropdown-item"
                    @click="openVSCodeSettingsModal(activeSnippet!.id)"
                  >
                    VSCode Snippet Settings
                  </button>
                  <button
                    type="button"
                    class="dropdown-item"
                    @click="handleMoveToTrashOrRestore(activeSnippet!.id)"
                  >
                    {{ activeSnippet!.deletedAt ? 'Restore from Trash' : 'Move to Trash' }}
                  </button>
                  <button
                    v-if="activeSnippet!.deletedAt"
                    type="button"
                    class="dropdown-item text-red-600 dark:text-red-400 hover:!bg-red-100 dark:hover:!bg-red-500/30"
                    @click="handleDeleteForever(activeSnippet!.id)"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="h-mainBody overflow-y-auto flex-1">
            <Editor
              v-if="activeSnippetContent !== null"
              :model-value="activeSnippetContent"
              @update:model-value="handleEditorChange"
              :language="activeSnippet.language"
              :readonly="!!activeSnippet.deletedAt"
              @save="saveActiveSnippetContent"
              class="h-full"
              placeholder="Start typing your snippet here..."
            />
             <div v-else class="p-4 text-zinc-400">Loading content...</div>
          </div>
        </div>
        <div v-else data-tauri-drag-region class="h-full w-full flex items-center justify-center px-20 text-center text-zinc-400 dark:text-zinc-500 text-xl">
          <span class="select-none">
            {{ appStore.folder ? 'Select or create a snippet from sidebar' : 'Open a folder to get started' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer can go here if needed -->
    <!-- <footer class="h-footer bg-zinc-100 dark:bg-zinc-800 border-t dark:border-zinc-700"></footer> -->

    <!-- Modals -->
    <LanguageModal
      :is-open="isLanguageModalOpen"
      @close="isLanguageModalOpen = false"
      @set-language="updateActiveSnippetLanguage"
    />
    <FolderHistoryModal
      :is-open="isFolderHistoryModalOpen"
      @close="isFolderHistoryModalOpen = false"
    />
    <VSCodeSnippetSettingsModal
      :is-open="!!vscodeSettingsModalSnippetId"
      :snippet-id="vscodeSettingsModalSnippetId"
      @close="vscodeSettingsModalSnippetId = undefined"
    />

    <!-- Floating Action Bar for Multi-select -->
    <div
      class="fixed left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-in-out"
      :class="{
        '-bottom-20': selectedSnippetIds.length === 0,
        'bottom-10': selectedSnippetIds.length > 0,
      }"
    >
      <div class="flex items-center bg-white dark:bg-zinc-700 rounded-lg shadow-xl border dark:border-zinc-600 px-3 h-10 space-x-2">
        <span class="text-sm text-zinc-700 dark:text-zinc-200">{{ selectedSnippetIds.length }} selected</span>
        <Button
          type="button"
          class="!h-7 btn-secondary"
          @click="handleMoveSelectedToTrashOrRestore"
        >
          {{ searchType === 'trash' ? 'Restore Selected' : 'Move to Trash' }}
        </Button>
         <Button
            v-if="searchType === 'trash'"
            type="button"
            class="!h-7 btn-danger"
            @click="handleDeleteSelectedForever"
          >
            Delete Forever
          </Button>
        <Button
          type="button"
          icon="i-bi:x-lg"
          class="!h-7 btn-icon"
          @click="selectedSnippetIds = []"
          tooltip="Clear selection"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { dialog, path as tauriPath } from '@tauri-apps/api'
import { useAppStore, type Snippet } from '../stores/app'
import Editor from '../components/Editor.vue'
import LanguageModal from '../components/LanguageModal.vue'
import FolderHistoryModal from '../components/FolderHistoryModal.vue'
import VSCodeSnippetSettingsModal from '../components/VSCodeSnippetSettingsModal.vue'
import Button from '../components/Button.vue'
import { getLanguageName as resolveLanguageName, languages as allLanguages } from '../lib/languages' // Ensure this path is correct
import { timeago as formatDate } from '../lib/date' // Ensure this path is correct
import { debounce as _debounce } from '../lib/utils' // Assuming a simple debounce, replace if different

// --- Store and Router ---
const appStore = useAppStore()
const router = useRouter()
const route = useRoute()

// --- State Refs ---
const activeSnippetId = ref<string | null>(null)
const activeSnippetContent = ref<string | null>(null)
const activeSnippetName = ref<string>('')

const searchKeyword = ref('')
const searchType = ref<'non-trash' | 'trash' | null>(null)
const selectedSnippetIds = ref<string[]>([])

const isLanguageModalOpen = ref(false)
const isFolderHistoryModalOpen = ref(false)
const vscodeSettingsModalSnippetId = ref<string | undefined>(undefined)

const searchInputRef = ref<HTMLInputElement | null>(null)

// This is a placeholder, real Tauri apps might use a custom titlebar or rely on OS controls
const isCustomTitlebarUsed = ref(false) 

// --- Utility Functions ---
const timeago = formatDate
const getLanguageName = resolveLanguageName
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => _debounce(func, delay)


// --- Computed Properties ---
const currentFolder = computed(() => route.query.folder as string || null)
const currentRouteSnippetId = computed(() => route.query.id as string || null)

const currentFolderName = computed(() => {
  if (appStore.folder) {
    return appStore.folder.split(tauriPath.sep).pop() || appStore.folder
  }
  return null
})

const activeSnippet = computed<Snippet | undefined>(() => {
  return appStore.snippets.find(s => s.id === activeSnippetId.value)
})

const filteredSnippets = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  return appStore.snippets
    .filter(snippet => {
      const isInTrash = !!snippet.deletedAt
      if (searchType.value === 'trash') {
        if (!isInTrash) return false
      } else {
        if (isInTrash) return false
      }

      if (keyword) {
        return snippet.name.toLowerCase().includes(keyword) ||
               (snippet.language && snippet.language.toLowerCase().includes(keyword))
      }
      return true
    })
    .sort((a, b) => {
      if (a.deletedAt && b.deletedAt) {
        return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime() // Most recently deleted first
      }
      if(a.updatedAt && b.updatedAt){
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); // Most recently updated first
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // Most recently created first
    })
})

// --- Watchers ---
watch(currentFolder, (newFolder, oldFolder) => {
  if (newFolder && newFolder !== oldFolder) {
    appStore.setFolder(newFolder)
    appStore.loadFolder(newFolder) // This will also update appStore.snippets
    activeSnippetId.value = null // Deselect snippet when folder changes
    activeSnippetContent.value = null
    selectedSnippetIds.value = []
    // If there's an ID in the URL for the new folder, try to select it
    if (currentRouteSnippetId.value) {
        selectSnippetById(currentRouteSnippetId.value)
    }
  } else if (!newFolder) {
    // If no folder is selected (e.g. navigated away or cleared query)
    appStore.setFolder(null)
    appStore.snippets = []
    activeSnippetId.value = null
    activeSnippetContent.value = null
    router.push('/') // Redirect to home if no folder
  }
}, { immediate: true })


watch(currentRouteSnippetId, (newId) => {
    if (newId && newId !== activeSnippetId.value) {
        selectSnippetById(newId);
    } else if (!newId && activeSnippetId.value) {
        // If URL ID is removed, deselect snippet if one is active
        // but don't clear if user just clicked on the same snippet again (handled by selectSnippet)
    }
});


watch(activeSnippetId, async (newId) => {
  if (newId) {
    const snippet = appStore.snippets.find(s => s.id === newId)
    if (snippet) {
      activeSnippetName.value = snippet.name
      if (!snippet.deletedAt) { // Don't load content for deleted, editor is readonly
        activeSnippetContent.value = await appStore.readSnippetContent(newId)
      } else {
        activeSnippetContent.value = "// This snippet is in the trash.\n// Restore it to edit.";
      }
       // Update URL if not already matching
      if (route.query.id !== newId) {
        router.replace({ query: { ...route.query, id: newId } })
      }
    }
  } else {
    activeSnippetContent.value = null
    activeSnippetName.value = ''
    // If active snippet is deselected, remove 'id' from URL
    if (route.query.id) {
        const { id, ...queryWithoutId } = route.query;
        router.replace({ query: queryWithoutId });
    }
  }
})

watch(searchType, (newType) => {
  searchKeyword.value = '' // Reset keyword when changing search type
  selectedSnippetIds.value = [] // Clear selection when changing view
  if (newType !== null) {
    nextTick(() => searchInputRef.value?.focus())
  }
  // If switching from/to trash view, and an active snippet exists,
  // check if it's still visible. If not, deselect it.
  if (activeSnippet.value) {
    const snippetVisibleInNewView = filteredSnippets.value.some(s => s.id === activeSnippet.value!.id);
    if (!snippetVisibleInNewView) {
      activeSnippetId.value = null; // Deselect
    }
  }
})

// --- Methods ---
function selectSnippetById(id: string | null) {
    if (!id) {
        activeSnippetId.value = null;
        return;
    }
    const snippetToSelect = appStore.snippets.find(s => s.id === id);
    if (snippetToSelect) {
        activeSnippetId.value = id;
    } else {
        // Snippet ID from URL not found (e.g. after folder change or deletion)
        activeSnippetId.value = null;
        // Optionally remove invalid ID from URL
        const { id: removedId, ...queryWithoutId } = route.query;
        if (removedId) router.replace({ query: queryWithoutId });
    }
}

const selectSnippet = (id: string, event?: MouseEvent) => {
  if (event?.shiftKey && activeSnippetId.value) { // Allow shift-click only if a primary snippet is already selected
    if (selectedSnippetIds.value.includes(id)) {
      selectedSnippetIds.value = selectedSnippetIds.value.filter(_id => _id !== id)
    } else {
      // Add to selection, but don't make it the active one for editing
      selectedSnippetIds.value.push(id)
    }
  } else {
    activeSnippetId.value = id
    selectedSnippetIds.value = [] // Clear multi-select on single click
    // router.push({ query: { ...route.query, id } }) // Let watcher handle URL update
  }
}

const isSnippetActive = (id: string) => {
  return id === activeSnippetId.value || selectedSnippetIds.value.includes(id)
}

const handleNewSnippet = async () => {
  if (!appStore.folder) {
    dialog.message('Please open a folder first.', { type: 'warning', title: 'No Folder Opened' })
    return
  }
  const newId = appStore.getRandomId()
  const newSnippetData: Snippet = {
    id: newId,
    name: 'Untitled Snippet',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: 'plaintext', // Default language
  }
  await appStore.createSnippet(newSnippetData, '') // Creates snippet file and adds to store
  searchType.value = null // Ensure not in trash view
  selectSnippetById(newId) // Select the new snippet
}

const handleEditorChange = debounce(async (value: string) => {
  if (activeSnippet.value && !activeSnippet.value.deletedAt && value !== activeSnippetContent.value) {
    await appStore.updateSnippetContent(activeSnippet.value.id, value)
    activeSnippetContent.value = value // Keep local content in sync to avoid re-trigger
    // No need to call syncSnippetsToVscode here, let updateSnippetContent handle it if necessary
  }
}, 500) // Debounce time

const saveActiveSnippetContent = async () => { // Explicit save, e.g. Ctrl+S
    if (activeSnippet.value && !activeSnippet.value.deletedAt && activeSnippetContent.value !== null) {
        await appStore.updateSnippetContent(activeSnippet.value.id, activeSnippetContent.value);
        // Optionally, add a visual confirmation for save
    }
}

const saveActiveSnippetName = async () => {
  if (activeSnippet.value && activeSnippetName.value.trim() !== activeSnippet.value.name) {
    if (activeSnippetName.value.trim() === '') {
      activeSnippetName.value = activeSnippet.value.name // Revert if empty
      dialog.message('Snippet name cannot be empty.', { type: 'error', title: 'Invalid Name' })
      return
    }
    await appStore.updateSnippet(activeSnippet.value.id, 'name', activeSnippetName.value.trim())
  }
}
const saveActiveSnippetNameAndBlur = (event: KeyboardEvent) => {
  saveActiveSnippetName();
  (event.target as HTMLInputElement)?.blur();
}


const updateActiveSnippetLanguage = async (languageId: string) => {
  if (activeSnippet.value) {
    await appStore.updateSnippet(activeSnippet.value.id, 'language', languageId)
  }
  isLanguageModalOpen.value = false
}

const openVSCodeSettingsModal = (snippetId: string) => {
  vscodeSettingsModalSnippetId.value = snippetId
}

const toggleSearchType = (type: 'non-trash' | 'trash') => {
  if (searchType.value === type) {
    searchType.value = null
  } else {
    searchType.value = type
  }
}

// --- Trash/Delete Operations ---
const handleMoveToTrashOrRestore = async (snippetId: string) => {
  const snippet = appStore.snippets.find(s => s.id === snippetId)
  if (!snippet) return

  const restore = !!snippet.deletedAt
  const message = restore
    ? `Are you sure you want to restore "${snippet.name}" from Trash?`
    : `Are you sure you want to move "${snippet.name}" to Trash?`

  if (await dialog.confirm(message, { title: 'Confirm Action' })) {
    await appStore.moveSnippetsToTrash([snippetId], restore)
    if (!restore && activeSnippetId.value === snippetId) { // If moved to trash
      activeSnippetId.value = null; // Deselect
    } else if (restore && searchType.value === 'trash') {
      // If restored from trash view, potentially switch view or deselect
      // For now, it just disappears from trash view. User can switch to non-trash.
    }
  }
}

const handleMoveSelectedToTrashOrRestore = async () => {
  if (selectedSnippetIds.value.length === 0) return

  const restore = searchType.value === 'trash'
  const message = restore
    ? `Are you sure you want to restore ${selectedSnippetIds.value.length} selected snippets from Trash?`
    : `Are you sure you want to move ${selectedSnippetIds.value.length} selected snippets to Trash?`

  if (await dialog.confirm(message, { title: 'Confirm Action' })) {
    await appStore.moveSnippetsToTrash([...selectedSnippetIds.value], restore)
    if (!restore && selectedSnippetIds.value.includes(activeSnippetId.value || '')) {
        activeSnippetId.value = null; // Deselect if active snippet was part of batch
    }
    selectedSnippetIds.value = []
  }
}

const handleDeleteForever = async (snippetId: string) => {
  const snippet = appStore.snippets.find(s => s.id === snippetId)
  if (!snippet || !snippet.deletedAt) return // Should only be called on trashed items

  if (await dialog.confirm(`"${snippet.name}" will be deleted forever. This cannot be undone.`, { title: 'Delete Forever?', type: 'warning' })) {
    await appStore.deleteSnippetForever(snippetId)
    if (activeSnippetId.value === snippetId) {
      activeSnippetId.value = null // Deselect if it was the active one
    }
  }
}

const handleDeleteSelectedForever = async () => {
    if (selectedSnippetIds.value.length === 0 || searchType.value !== 'trash') return;

    if (await dialog.confirm(`Delete ${selectedSnippetIds.value.length} selected snippets forever? This cannot be undone.`, { title: 'Delete Forever?', type: 'warning' })) {
        for (const id of selectedSnippetIds.value) {
            await appStore.deleteSnippetForever(id); // Sequentially, or Promise.all
        }
        if (selectedSnippetIds.value.includes(activeSnippetId.value || '')) {
            activeSnippetId.value = null;
        }
        selectedSnippetIds.value = [];
    }
}


const handleEmptyTrash = async () => {
  const trashCount = appStore.snippets.filter(s => s.deletedAt).length
  if (trashCount === 0) {
    dialog.message('Trash is already empty.', { title: 'Empty Trash' })
    return
  }
  if (await dialog.confirm(`Permanently erase all ${trashCount} items in the Trash? This cannot be undone.`, { title: 'Empty Trash?', type: 'warning' })) {
    await appStore.emptyTrash()
    if (activeSnippet.value && activeSnippet.value.deletedAt) {
      activeSnippetId.value = null // Deselect if active snippet was in trash
    }
  }
}


// --- Periodic Refresh (Original had this, consider if needed with Tauri events or manual refresh) ---
let folderWatcherInterval: number | undefined
let contentWatcherInterval: number | undefined

const clearWatchers = () => {
  if (folderWatcherInterval) clearInterval(folderWatcherInterval)
  if (contentWatcherInterval) clearInterval(contentWatcherInterval)
  folderWatcherInterval = undefined
  contentWatcherInterval = undefined
}

const setupWatchers = () => {
  clearWatchers()
  if (currentFolder.value) {
    // Periodically reload folder contents (e.g., if changed outside the app)
    // folderWatcherInterval = window.setInterval(() => {
    //   if (document.hasFocus() && currentFolder.value) { // Only if window has focus
    //     console.log("Periodic folder refresh:", currentFolder.value);
    //     appStore.loadFolder(currentFolder.value);
    //   }
    // }, 15000); // e.g., every 15 seconds

    // Periodically reload content of active snippet (less critical if using Tauri events for file changes)
    // contentWatcherInterval = window.setInterval(async () => {
    //   if (document.hasFocus() && activeSnippetId.value && !activeSnippet.value?.deletedAt) {
    //     console.log("Periodic content refresh for:", activeSnippetId.value);
    //     const freshContent = await appStore.readSnippetContent(activeSnippetId.value);
    //     if (freshContent !== activeSnippetContent.value) {
    //       activeSnippetContent.value = freshContent;
    //       // If editor is focused, this might be disruptive. Consider only if editor not focused.
    //     }
    //   }
    // }, 5000); // e.g., every 5 seconds
  }
}

watch(currentFolder, setupWatchers, { immediate: true })
// watch(activeSnippetId, setupWatchers, { immediate: true }) // Content watcher might be better tied to activeSnippetId

onMounted(() => {
  if (!currentFolder.value && appStore.app.folders.length > 0) {
    // If no folder in URL, but history exists, navigate to the most recent one.
    // router.replace({ query: { folder: appStore.app.folders[0] } });
    // Or, redirect to home if no folder is provided in the URL.
     router.push('/')
  } else if (currentFolder.value) {
    // If folder is in URL, ensure it's loaded.
    // `watch currentFolder` handles this.
    // If an ID is also in the URL, try to select it.
    if (currentRouteSnippetId.value) {
        selectSnippetById(currentRouteSnippetId.value);
    }
  } else if (!currentFolder.value && appStore.app.folders.length === 0) {
    // No folder in URL and no history, redirect to home.
    router.push('/')
  }
  setupWatchers();
})

onUnmounted(() => {
  clearWatchers()
})

</script>

<style scoped>
.h-main {
  height: calc(100vh - theme(height.footer)); /* Assuming a fixed footer height if you add one */
}
.h-mainHeader {
  height: 3rem; /* 48px */
}
.h-mainBody {
  height: calc(100% - theme(height.mainHeader));
}

.sidebar-body {
  /* Custom scrollbar styling if needed */
}
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5); /* zinc-400 with opacity */
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.5); /* zinc-500 with opacity */
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(100, 116, 139, 0.5); /* slate-500 with opacity */
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(71, 85, 105, 0.5); /* slate-600 with opacity */
}


.dropdown-item {
  @apply cursor-pointer w-full px-3 h-7 flex items-center whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-600;
}

.btn-secondary {
  @apply bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600;
}
.btn-danger {
    @apply bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700;
}
.btn-icon {
    @apply !p-0 w-7; /* For icon only buttons in the multi-select bar */
}
</style>
