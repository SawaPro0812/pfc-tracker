import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { seedFoodsIfEmpty } from './db/index.js'

seedFoodsIfEmpty()

createApp(App).use(router).mount('#app')
