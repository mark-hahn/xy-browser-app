import Vue       from 'vue'
import App       from './App.vue'
import VueRouter from 'vue-router'
import netComp   from "./network/network-page.vue"
import zdemoComp from "./zdemo/z-demo.vue"

Vue.use(VueRouter);
window.eventBus = new Vue();

window.dbgHost = window.location.port === '8080' ? 'http://192.168.1.245' : '';

// TODO
const Terminal = { template: '<div>Terminal</div>' }
const Apps     = { template: '<div>Apps</div>' }

const router = new VueRouter({ routes: [
  {path: '/', redirect: '/ZDemo'},
  {path: '/zdemo',     component: zdemoComp,  meta:{name:'ZDemo'}},
  {path: '/terminal',  component: Terminal,   meta:{name:'Terminal'}},
  {path: '/apps',      component: Apps,       meta:{name:'Apps'}},
  {path: '/network',   component: netComp,    meta:{name:'Network'}}
]});

router.afterEach((to, from) => {
  if(from.path == "/ZDemo") {
    console.log("rounter from", from, "to", to);
  }
});

new Vue({
  router,
  el: '#app',
  render: h => h(App)
})
