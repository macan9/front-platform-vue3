import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 使用 mock
// require('./common/mock/index.js') 



// 定义 app 
const app = createApp(App)

// app.config.devtools = true

// 注册 element icon 
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}



app.use(router).use(store).use(ElementPlus).mount('#app')

