
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
  export default {
    name: 'net-scan',
    data: function () {
      return {
        msg: "Scanning WiFi access points ..."
      }
    }
  }
</script>
