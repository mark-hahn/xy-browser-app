<style>
  html { box-sizing: border-box; }
  *, *:before, *:after { box-sizing: inherit; }
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
</style>

<style lang="less" scoped>
  #app { margin: 20px; }
  #logo { cursor: pointer; }
  img {
    display: inline-block;
    height:65px
  }
  #page-title {
    position:relative;
    top:-19px;
    margin-left:40px;
    display: inline-block;
    font-weight:bold;
    font-size:25px;
  }
  #nav-bar {
    max-width: 650px;
    padding:10px;
    position:relative;
    top:-10px;
    width:100%;
    border:1px solid black;
    border-radius:4px;
    background-color:#66f;
    .nav-btn {
      margin-left:15px;
      border:1px solid black;
      border-radius:3px;
      color:black;
      font-weight: bold;
      padding:3px;
      text-decoration:none;
      &.router-link-active {
        background-color:white;
      }
      &:not(.router-link-active) {
        background-color:#ccc;
      }
    }
  }
</style>

<template>
  <div id="app">
    <div>
      <img id="logo" @click="home()" src="src/assets/eridien-logo.jpg">
      <div id="page-title"> XY {{$route.meta.name}} </div>
      <div id="nav-bar">
        <router-link class="nav-btn" to="/ZDemo">
          <a>Z Demo</a>
        </router-link>
        <router-link class="nav-btn" to="/Terminal">
          <a>Terminal</a>
        </router-link>
        <router-link class="nav-btn" to="/apps">
          <a>Apps</a>
        </router-link>
        <router-link class="nav-btn" to="/network">
          <a>Network</a>
        </router-link>
    </div>
    <router-view ref="routerView"></router-view>
  </div>
</template>


<script>
  export default {
    name: 'app',
    data() { return {
      curPage: 'zdemo'
    }},
    methods: {
      home: function()  {
        window.location = '/';
      }
    }
  }
</script>
