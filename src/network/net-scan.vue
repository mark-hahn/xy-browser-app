
<style lang="less" scoped>
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-msg"> {{msg}} </div>
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
