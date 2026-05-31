/**
 * 巨人赛跑 - 前端入口 v3.0
 * Vue 3 + Vue Router
 */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
