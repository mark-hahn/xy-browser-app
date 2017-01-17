import Vue       from 'vue'
import App       from './App.vue'
import VueRouter from 'vue-router'
import netComp   from "./network/network-page.vue"

Vue.use(VueRouter);
window.eventBus = new Vue();

window.dbgHost = window.location.port === '9000' ?
                    'http://192.168.1.244' : '';

// TODO
const Platform = { template: '<div>Platform</div>' }
const Apps     = { template: '<div>Apps</div>' }

const router = new VueRouter({ routes: [
  {path: '/platform',  component: Platform, meta:{name:'Platform'}},
  {path: '/apps',      component: Apps, meta:{name:'Apps'}},
  {path: '/network',   component: netComp, meta:{name:'Network'}}
]});

new Vue({
  router,
  el: '#app',
  render: h => h(App)
})
