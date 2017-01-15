

<style lang="less">
  .network-page-pane {
    border: 1px solid black;
    width: 600px;
    padding:10px;
    margin-bottom:10px;
  }
  .network-page-pane-msg {
    font-weight: bold;
  }
</style>

<style lang="less" scoped>

</style>

<template lang="html">
  <div>
    <net-status   class="net"> </net-status>
    <net-settings class="net"> </net-settings>
    <net-scan     class="net"> </net-scan>
  </div>
</template>

<script>
  import netStatus   from "./net-status.vue"
  import netSettings from "./net-settings.vue"
  import netScan     from "./net-scan.vue"

  export default {
    components: {netStatus, netSettings, netScan},
    name: 'network-page',
    data: function () {
      return {
        hdrName: 'Network'
      }
    }
  }
</script>
