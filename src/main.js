import Vue       from 'vue'
import App       from './App.vue'
import VueRouter from 'vue-router'
import netComp   from "./network/network-page.vue"

Vue.use(VueRouter);


const Platform = { template: '<div>Platform</div>' }
const Apps     = { template: '<div>Apps</div>' }
const routes = [
  {path: '/platform',  component: Platform},
  {path: '/apps',      component: Apps},
  {path: '/network',   component: netComp}
]
const router = new VueRouter({routes})

new Vue({
  router,
  el: '#app',
  render: h => h(App)
})
