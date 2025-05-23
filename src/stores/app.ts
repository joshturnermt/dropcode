import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { fs, path, dialog, os } from '@tauri-apps/api'
import { BaseDirectory } from '@tauri-apps/api/fs'

// Interfaces (copied from src/store.ts)
export interface Snippet {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  language?: string
  deletedAt?: string
  vscodeSnippet?: {
    prefix?: string
  }
}

export interface AppData {
  folders: string[]
}

// Helper functions (copied from src/store.ts)
// These could be moved to a utility file later if needed
const writeSnippetsJson = async (folder: string, snippets: Snippet[]) => {
  console.log('writing snippets.json')
  await fs.writeTextFile(
    await path.join(folder, 'snippets.json'),
    JSON.stringify(snippets)
  )
}

const writeAppJson = async (appData: AppData) => {
  await fs.createDir('', { dir: BaseDirectory.App, recursive: true })
  await fs.writeTextFile('app.json', JSON.stringify(appData), {
    dir: BaseDirectory.App,
  })
}

const pathExists = async (filePath: string, baseDir?: BaseDirectory) => {
  return await fs.exists(filePath, { dir: baseDir })
}

export const useAppStore = defineStore('app', {
  state: () => ({
    ready: false,
    app: {
      folders: [],
    } as AppData,
    folder: null as string | null,
    snippets: [] as Snippet[],
    isMac: /macintosh/i.test(navigator.userAgent), // or navigator.userAgentData.platform.toLowerCase().startsWith('mac')
  }),

  actions: {
    async init() {
      try {
        const text = await fs.readTextFile('app.json', { dir: BaseDirectory.App })
        const appData: Partial<AppData> = JSON.parse(text)
        if (appData.folders) {
          this.app.folders = appData.folders
        }
      } catch (error) {
        console.error('Failed to read app.json:', error)
        // Initialize with empty folders if file doesn't exist or is corrupted
        this.app.folders = []
      }
      this.ready = true
    },

    setFolder(folder: string | null) {
      this.folder = folder
    },

    async removeFolderFromHistory(folder: string) {
      this.app.folders = this.app.folders.filter((f) => f !== folder)
      await writeAppJson(this.app)
    },

    async loadFolder(folder: string) {
      const exists = await pathExists(folder)

      if (!exists) {
        await this.removeFolderFromHistory(folder)
        await dialog.message("Folder doesn't exist")
        return
      }

      const snippetsPath = await path.join(folder, 'snippets.json')
      try {
        const text = await fs.readTextFile(snippetsPath)
        this.snippets = JSON.parse(text)
      } catch (error) {
        console.error('Failed to read snippets.json:', error)
        this.snippets = [] // Initialize with empty snippets if file doesn't exist or is corrupted
      }

      if (this.app.folders.includes(folder)) {
        this.app.folders = [
          folder,
          ...this.app.folders.filter((f) => f !== folder),
        ]
      } else {
        // Keep the history to a reasonable limit, e.g., 10 most recent
        this.app.folders = [folder, ...this.app.folders.slice(0, 9)]
      }

      await writeAppJson(this.app)
      this.folder = folder // Ensure current folder is set
    },

    async createSnippet(snippet: Snippet, content: string) {
      if (!this.folder) return

      const filepath = await path.join(this.folder, snippet.id)
      await fs.writeTextFile(filepath, content)
      this.snippets.push(snippet) // Direct mutation is fine in Pinia
      await writeSnippetsJson(this.folder, this.snippets)
    },

    getRandomId() {
      return nanoid(10)
    },

    async readSnippetContent(id: string) {
      if (!this.folder) return ''
      try {
        const text = await fs.readTextFile(await path.join(this.folder, id))
        return text
      } catch (error) {
        console.error(`Failed to read content for snippet ${id}:`, error)
        return ''
      }
    },

    async updateSnippet<K extends keyof Snippet, V extends Snippet[K]>(
      id: string,
      key: K,
      value: V
    ) {
      if (!this.folder) return

      const snippetIndex = this.snippets.findIndex((s) => s.id === id)
      if (snippetIndex !== -1) {
        this.snippets[snippetIndex] = {
          ...this.snippets[snippetIndex],
          [key]: value,
          updatedAt: new Date().toISOString(),
        }
        await writeSnippetsJson(this.folder, this.snippets)
        await this.syncSnippetsToVscode()
      }
    },

    async updateSnippetContent(id: string, content: string) {
      if (!this.folder) return

      const filepath = await path.join(this.folder, id)
      try {
        await fs.writeTextFile(filepath, content)
        // Also update the snippet's updatedAt timestamp
        const snippetIndex = this.snippets.findIndex((s) => s.id === id)
        if (snippetIndex !== -1) {
          this.snippets[snippetIndex].updatedAt = new Date().toISOString()
          await writeSnippetsJson(this.folder, this.snippets) // Write updated snippets array
        }
      } catch (error) {
        console.error(`Failed to update content for snippet ${id}:`, error)
      }
    },

    async moveSnippetsToTrash(ids: string[], restore = false) {
      if (!this.folder) return

      this.snippets = this.snippets.map((snippet) => {
        if (ids.includes(snippet.id)) {
          return {
            ...snippet,
            deletedAt: restore ? undefined : new Date().toISOString(),
          }
        }
        return snippet
      })

      await writeSnippetsJson(this.folder, this.snippets)
      await this.syncSnippetsToVscode()
    },

    async deleteSnippetForever(id: string) {
      if (!this.folder) return

      this.snippets = this.snippets.filter((snippet) => snippet.id !== id)
      await writeSnippetsJson(this.folder, this.snippets)
      try {
        await fs.removeFile(await path.join(this.folder, id))
      } catch (error) {
        console.error(`Failed to delete file for snippet ${id}:`, error)
      }
    },

    async emptyTrash() {
      if (!this.folder) return
      const toDeleteIds: string[] = []
      this.snippets = this.snippets.filter((snippet) => {
        if (snippet.deletedAt) {
          toDeleteIds.push(snippet.id)
          return false // Remove from snippets array
        }
        return true // Keep in snippets array
      })

      await writeSnippetsJson(this.folder, this.snippets)
      await Promise.all(
        toDeleteIds.map(async (id) => {
          try {
            return fs.removeFile(await path.join(this.folder!, id))
          } catch (error) {
            console.error(`Failed to delete file for snippet ${id} during emptyTrash:`, error)
          }
        })
      )
    },

    // getFolderHistory was not directly using state in the old store,
    // it was reading a separate 'folders.json'.
    // The current `init` loads folders from `app.json`.
    // If 'folders.json' is a legacy thing or a different feature,
    // this needs clarification. For now, I'll assume app.folders is the source of truth.
    // If we need to read a separate `folders.json`, that logic can be added here.
    // async getFolderHistory() {
    //   // This might be redundant if app.folders is the source of truth
    //   return this.app.folders;
    // },

    async syncSnippetsToVscode() {
      if (!this.folder) return

      const folderName = this.folder.split(path.sep).pop()!

      type VSCodeSnippets = Record<
        string,
        { scope: string; prefix: string[]; body: string[]; __folderName: string }
      >

      const newSnippets: VSCodeSnippets = {}

      for (const s of this.snippets) {
        const prefix = s.vscodeSnippet?.prefix?.trim()

        if (!prefix || s.deletedAt) {
          continue
        }

        const content = await this.readSnippetContent(s.id)
        newSnippets[s.name] = {
          scope: '', // Consider making this configurable
          prefix: prefix
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          body: [content], // Content should be string array
          __folderName: folderName,
        }
      }

      const snippetsFileName = 'dropcode.code-snippets'
      // Determine VS Code snippets directory based on OS
      // This logic might need to be more robust
      let snippetsDirRoot = BaseDirectory.Data; // Default for some systems
      const platform = await os.platform(); // tauri os.platform() gives 'darwin', 'linux', 'windows'
      
      let codeSnippetsDir = '';

      if (platform === 'darwin') { // macOS
        codeSnippetsDir = `Library/Application Support/Code/User/snippets`
        snippetsDirRoot = BaseDirectory.Home;
      } else if (platform === 'linux') {
        codeSnippetsDir = `.config/Code/User/snippets` // Or similar, check common paths
         snippetsDirRoot = BaseDirectory.Home;
      } else if (platform === 'win32') { // Windows
        codeSnippetsDir = `AppData\\Roaming\\Code\\User\\snippets` // Check exact path
        snippetsDirRoot = BaseDirectory.Home; // Usually under %APPDATA% which is AppData/Roaming under Home
      } else {
        console.warn('Unsupported platform for VSCode sync:', platform)
        return
      }
      
      const snippetsFilePath = await path.join(codeSnippetsDir, snippetsFileName)


      // VSCode is not installed or path is incorrect
      if (!(await pathExists(codeSnippetsDir, snippetsDirRoot))) {
         console.warn('VSCode snippets directory not found:', await path.join(await path.homeDir(), codeSnippetsDir) );
        // Fallback or create? For now, just return.
        // Before returning, check if the base 'Code' directory exists (or 'Code/User')
        // to differentiate between "VSCode not installed" and "Snippets folder doesn't exist yet".
        let checkDir = codeSnippetsDir.substring(0, codeSnippetsDir.indexOf(`${path.sep}User${path.sep}snippets`));
        if (platform === 'darwin') checkDir = `Library/Application Support/Code`; // More specific check for macOS
        else if (platform === 'linux') checkDir = `.config/Code`;
        else if (platform === 'win32') checkDir = `AppData\\Roaming\\Code`;
        
        if (!(await pathExists(checkDir, snippetsDirRoot))) {
            console.log("VSCode does not appear to be installed.");
            return;
        }
        // If VSCode seems installed but snippets dir is missing, create it.
        console.log("VSCode snippets directory does not exist, creating it:", await path.join(await path.homeDir(), codeSnippetsDir));
        try {
            await fs.createDir(codeSnippetsDir, { dir: snippetsDirRoot, recursive: true });
        } catch (e) {
            console.error("Failed to create VSCode snippets directory:", e);
            return;
        }
      }


      const existingSnippets: VSCodeSnippets = (await pathExists(
        snippetsFilePath,
        snippetsDirRoot
      ))
        ? JSON.parse(
            await fs.readTextFile(snippetsFilePath, { dir: snippetsDirRoot })
          )
        : {}

      // Merge old and new snippets
      for (const name in existingSnippets) {
        const snippet = existingSnippets[name]
        if (snippet.__folderName === folderName) {
          delete existingSnippets[name]
        }
      }
      Object.assign(existingSnippets, newSnippets)

      // Write to file
      console.log('writing VSCode snippets to:', snippetsFilePath)
      // Ensure directory exists before writing (path.join might not be enough for fs.writeTextFile)
      // The pathExists check above for codeSnippetsDir and potential creation should handle this.
      await fs.writeTextFile(
        snippetsFilePath,
        JSON.stringify(existingSnippets, null, 2),
        { dir: snippetsDirRoot }
      )
    },
  },
})
