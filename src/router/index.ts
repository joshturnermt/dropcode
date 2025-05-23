import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Home from '../screens/Home.vue'
import Snippets from '../screens/Snippets.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/snippets', // Path for snippets, might include params like /snippets/:folder/:id later if preferred
    name: 'Snippets',
    component: Snippets,
    // Props can be used to pass route params as component props, e.g.
    // props: route => ({ folder: route.query.folder, snippetId: route.query.id })
  },
  // Fallback route for undefined paths - redirect to Home
  {
    path: '/:pathMatch(.*)*', 
    redirect: '/',
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL), // Using hash history for Tauri
  routes,
})

export default router
