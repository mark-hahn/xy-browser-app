<style>
  html { box-sizing: border-box; }
  *, *:before, *:after { box-sizing: inherit; }
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
</style>

<style lang="less" scoped>
  #app { margin: 30px; }
  img { height:65px }
  #page-hdr {
    margin:30px 10px;
    float:right;
    display: inline-block;
    font-weight:bold;
    font-size:25px;
  }
  #nav-bar {
    padding:10px;
    position:relative;
    top:-10px;
    width:100%;
    border:1px solid black;
    .nav-btn {
      color:black;
      display: inline-block;
    }
  }
</style>

<template>
  <div id="app">
    <div>
      <img src="src/assets/eridien-logo.jpg">
      <div id="page-hdr"> XY {{pagehdr}} </div>
      <div id="nav-bar">
        <router-link to="/platform">
          <div class="nav-btn">Platform</div>
        </router-link>
        <router-link to="/apps">
          <div class="nav-btn">Apps</div>
        </router-link>
        <router-link to="/network">
          <div class="nav-btn">Network</div>
        </router-link>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
  export default {
    name: 'app',
    data () {
      return {
        'pagehdr': 'Platform'
      }
    }
  }
</script>
