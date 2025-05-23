import { ref, onMounted, onUnmounted, watch } from 'vue'

type DarkModePreference = 'light' | 'dark' | 'system';

export function useDarkMode(defaultPreference: DarkModePreference = 'system') {
  const isDarkMode = ref(false)
  const preference = ref<DarkModePreference>(loadPreference())

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  function update() {
    if (preference.value === 'system') {
      isDarkMode.value = mediaQuery.matches
    } else {
      isDarkMode.value = preference.value === 'dark'
    }
    document.documentElement.classList.toggle('dark', isDarkMode.value)
  }

  function toggleDarkMode() {
    if (preference.value === 'system') {
      // If system is dark, toggle to light, else to dark
      setPreference(mediaQuery.matches ? 'light' : 'dark');
    } else {
      // Toggle current explicit preference
      setPreference(preference.value === 'dark' ? 'light' : 'dark');
    }
  }

  function setPreference(newPreference: DarkModePreference) {
    preference.value = newPreference
    savePreference(newPreference)
    update()
  }
  
  function loadPreference(): DarkModePreference {
    const storedPreference = localStorage.getItem('darkModePreference') as DarkModePreference | null
    return storedPreference || defaultPreference
  }

  function savePreference(pref: DarkModePreference) {
    localStorage.setItem('darkModePreference', pref)
  }

  const handleChange = () => {
    if (preference.value === 'system') {
      update()
    }
  }

  onMounted(() => {
    update() // Initial update based on loaded preference
    mediaQuery.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleChange)
  })

  // Watch for preference changes to update dark mode
  watch(preference, update, { immediate: true });


  return {
    isDarkMode,
    preference, // Expose preference if UI needs to show current setting (light/dark/system)
    toggleDarkMode,
    setPreference, // Allow setting to light/dark/system
  }
}
