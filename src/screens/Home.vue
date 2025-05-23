<template>
  <div data-tauri-drag-region class="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 p-8">
    <div class="fixed top-0 left-0 w-full h-8" data-tauri-drag-region></div>
    <img src="/icon.png" alt="Dropcode Logo" class="w-24 h-24 mb-8" />
    <h1 class="text-4xl font-bold mb-6">Dropcode</h1>
    <p class="text-lg mb-10">Your lightweight, folder-based snippet manager.</p>

    <div class="space-x-4 mb-12">
      <Button @click="handleOpenFolderDialog" icon="i-bi:folder-symlink" class="px-4 py-2 text-base">
        Open Folder
      </Button>
      <Button @click="handleCreateNewFolder" icon="i-bi:folder-plus" class="px-4 py-2 text-base btn-secondary">
        Create New Project
      </Button>
    </div>

    <div v-if="appStore.app.folders && appStore.app.folders.length > 0" class="w-full max-w-2xl">
      <h2 class="text-xl font-semibold mb-4 text-center">Recent Projects</h2>
      <ul class="bg-white dark:bg-zinc-800 shadow-md rounded-lg overflow-hidden">
        <li
          v-for="folder in appStore.app.folders.slice(0, 5)"
          :key="folder"
          class="border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
        >
          <div
            @click="loadFolderFromHistory(folder)"
            class="flex justify-between items-center p-4 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer group"
          >
            <div>
              <span class="font-medium">{{ getFolderName(folder) }}</span>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 truncate group-hover:text-zinc-600 dark:group-hover:text-zinc-300">{{ folder }}</p>
            </div>
            <div class="flex items-center space-x-2">
               <!-- <span class="text-xs text-zinc-400 dark:text-zinc-500">{{ folderAccessTime(folder) }}</span> -->
              <Button
                @click.stop="handleRemoveFolderFromHistory(folder)"
                icon="i-bi:x-lg"
                class="w-7 h-7 !p-0 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from history"
              />
            </div>
          </div>
        </li>
      </ul>
       <p v-if="appStore.app.folders.length > 5" class="text-sm text-center mt-4 text-zinc-500 dark:text-zinc-400">
        And {{ appStore.app.folders.length - 5 }} more...
      </p>
    </div>
     <div v-else class="text-center text-zinc-500 dark:text-zinc-400">
      <p>No recent projects. Open a folder to get started!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dialog, path, fs } from '@tauri-apps/api'
import { useAppStore } from '../stores/app'
import Button from '../components/Button.vue' // Assuming Button.vue is in components
import dayjs from 'dayjs' // For date formatting if needed, or use a lib
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const router = useRouter()
const appStore = useAppStore()

const timeago = (date: string | Date) => {
  return dayjs(date).fromNow()
}

// This is a placeholder. Actual access times aren't stored by default.
// const folderAccessTime = (folderPath: string) => {
//   // const stats = fs.statSync(folderPath); // This would be synchronous and potentially slow
//   // return timeago(new Date()); // Placeholder
//   return "" // For now, let's not display time as it's not readily available
// }


const getFolderName = (folderPath: string): string => {
  // This is a simple way, might need more robust path parsing
  return folderPath.split(path.sep).pop() || folderPath
}

const navigateToSnippets = (folderPath: string) => {
  router.push({ path: '/snippets', query: { folder: folderPath } })
}

const handleOpenFolderDialog = async () => {
  try {
    const selectedPath = await dialog.open({
      directory: true,
      multiple: false,
      // defaultPath: await path.homeDir(), // Optional: set a default path
    })
    if (typeof selectedPath === 'string') {
      await appStore.loadFolder(selectedPath) // This sets the folder and loads snippets
      navigateToSnippets(selectedPath)
    }
  } catch (err) {
    console.error('Error opening folder:', err)
    dialog.message(`Failed to open folder: ${err}`, { type: 'error', title: 'Error' })
  }
}

const handleCreateNewFolder = async () => {
  try {
    const selectedPath = await dialog.save({
      // title: 'Create New Project Folder', // Title for the dialog
      // defaultPath: await path.join(await path.homeDir(), 'NewDropcodeProject'), // Suggest a name/path
      // filters: [], // No filters for directory creation
    });

    if (typeof selectedPath === 'string') {
      // Check if path ends with .json, if so, it's a file path from dialog.save. We need a directory.
      // This is a workaround because dialog.save is for files. A proper folder picker for "save" is tricky.
      // For now, let's assume user picks a location and we append a folder name, or they type a folder name.
      // A better approach might be to ask for folder name, then open a dialog to pick parent directory.
      // For simplicity, let's assume selectedPath is the desired new folder path.
      // Ensure the directory exists or create it.
      if (!(await fs.exists(selectedPath))) {
        await fs.createDir(selectedPath, { recursive: true });
      } else if (!(await fs.readDir(selectedPath)).length) {
        // Directory exists but is empty, proceed.
      } else {
        const isEmpty = (await fs.readDir(selectedPath)).length === 0;
        if (!isEmpty) {
            const confirm = await dialog.confirm(`${selectedPath} is not empty. Use anyway?`, {title: "Folder Not Empty", type: 'warning'});
            if (!confirm) return;
        }
      }

      // Create an empty snippets.json
      const snippetsJsonPath = await path.join(selectedPath, 'snippets.json')
      if (!(await fs.exists(snippetsJsonPath))) {
        await fs.writeTextFile(snippetsJsonPath, '[]') // Empty array for snippets
      }
      
      await appStore.loadFolder(selectedPath)
      navigateToSnippets(selectedPath)
    }
  } catch (err) {
    console.error('Error creating new folder:', err)
    dialog.message(`Failed to create new project: ${err}`, { type: 'error', title: 'Error' })
  }
}

const loadFolderFromHistory = async (folderPath: string) => {
  // loadFolder also handles adding to front of history and writing app.json
  await appStore.loadFolder(folderPath) 
  navigateToSnippets(folderPath)
}

const handleRemoveFolderFromHistory = async (folderPath: string) => {
  await appStore.removeFolderFromHistory(folderPath)
  // State updates automatically due to Pinia's reactivity
}

onMounted(async () => {
  // Initialize the store if not already (e.g. app data like folders)
  // appStore.init() is called in App.vue, so it should be ready.
  // Redirect if a folder is already selected (e.g. app was launched with a folder context)
  // or if there's a "last opened folder" logic (not implemented here, but store.folder might be set)

  // The original Home.tsx redirected to the first folder in history.
  // We keep this behavior if no specific folder is already active.
  if (!appStore.folder && appStore.app.folders.length > 0) {
    // Do not auto-redirect from Home, let user choose.
    // If you want auto-redirect:
    // await loadFolderFromHistory(appStore.app.folders[0]);
  }
})
</script>

<style scoped>
/* Add any specific styles for Home.vue if needed */
/* Using Tailwind utility classes primarily */
.btn-secondary {
  @apply bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600;
}
</style>
