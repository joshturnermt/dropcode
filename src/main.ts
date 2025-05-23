import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // Now we import and use it
import tooltipDirective from './directives/tooltip' // Import the directive
import 'tippy.js/dist/tippy.css'
import 'uno.css'
import './css/tailwind.css'
import './css/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router) // Use the router
app.directive('tooltip', tooltipDirective) // Register the directive globally

app.mount('#root')
