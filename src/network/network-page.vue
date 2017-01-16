
<!-- global -->
<style lang="less">
  .network-page-pane {
    border: 1px solid black;
    max-width: 650px;
    padding:10px;
    margin-bottom:10px;
    &-hdr {
      font-weight: bold;
    }
    &-body {
      max-width: 640px;
      margin-top:10px;
    }
  }
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
    name: 'network-page',
    components: {netStatus, netSettings, netScan},
  }
</script>
