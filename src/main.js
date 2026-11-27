import { createApp } from "vue";

import EventBusPlugin from "./utils/event-bus.js";

import "element-plus/dist/index.css";
import "./styles/normalize.css";
import "./styles/index.less";

import router from "./router";

import App from "./App.vue";

// import * as ElementPlusIconsVue from "@element-plus/icons-vue";

const app = createApp(App);

// // 注册所有 ElementPlus 图标
// for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
//     app.component(key, component);
// }

app.use(router);
app.use(EventBusPlugin);

app.mount("#app");
