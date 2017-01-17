import Vue       from 'vue'
import App       from './App.vue'
import VueRouter from 'vue-router'
import netComp   from "./network/network-page.vue"

Vue.use(VueRouter);
window.eventBus = new Vue();

window.dbgHost = window.location.port === '8080' ? 'http://192.168.1.244' : '';

// TODO
const Scribe   = { template: '<div>Scribe</div>' }
const Terminal = { template: '<div>Terminal</div>' }
const Apps     = { template: '<div>Apps</div>' }

const router = new VueRouter({ routes: [
  {path: '/', redirect: '/scribe'},
  {path: '/scribe',    component: Scribe,   meta:{name:'Scribe'}},
  {path: '/terminal',  component: Terminal, meta:{name:'Terminal'}},
  {path: '/apps',      component: Apps,     meta:{name:'Apps'}},
  {path: '/network',   component: netComp,  meta:{name:'Network'}}
]});

new Vue({
  router,
  el: '#app',
  render: h => h(App)
})
