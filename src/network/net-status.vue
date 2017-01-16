
<style lang="less" scoped>
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr"> {{msg}} </div>
    <div class="network-page-pane-body">
    </div>
  </div>
</template>

<script>
  import axios from 'axios'
  export default {
    name: 'net-status',
    data: function () {
      return {
        msg: "Checking network status ..."
      }
    },
    mounted: function()  {
      axios.get(window.dbgHost + '/ajax/wifi-status')
      .then(function (response) {
        console.log('response', response);
      })
      .catch(function (error) {
        console.log('error', error);
      });
    }
  }
</script>
