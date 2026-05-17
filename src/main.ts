import { createPinia } from 'pinia'
import 'cropperjs/dist/cropper.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
