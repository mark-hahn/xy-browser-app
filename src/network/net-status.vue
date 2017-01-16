
<style lang="less" scoped>
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr"> {{msg}} </div>
    <div class="network-page-pane-body">
      <ul v-show="isVisible">
        <li> XY is hosting the access point <b>{{status.apSsid}}</b> at <b>{{status.apIp}}</b>. </li>
        <li> XY is connected to to the access point <b>{{status.staSsid}}</b>
             at <b>{{status.staIp}} (http://xy.local)</b>.
        <li v-show="isConnected">
          XY is using <b>{{connSsid}}</b> to connect to your computer. </li>
        <li v-show="isConnected">
          Your computer and XY are connected to the internet. </li>
        <li v-show="!isConnected"> XY is not connected to an access point. </li>
        <li v-show="!isConnected">
          Your computer and XY have no access to the internet. </li>
      </ul>
    </div>
  </div>
</template>

<script>
  import axios from 'axios'
  export default {
    data: function () {
      return {
        status: { apSsid:'', apIp:'', staIp:'', staSsid:'' },
        msg: "Checking network status ...",
        isVisible: false,
        isConnected: false,
        connSsid: ''
      }
    },
    mounted: function()  {
      axios.get(window.dbgHost + '/ajax/wifi-status')
      .then( (response) => {
        console.log('response', response.data[0]);
        this.status = response.data[0];
        this.msg = "Network status"
        this.isVisible = true;
        let host = window.location.hostname;
        this.connSsid = (host === 'xy.local' ||
                         host === this.status.apIp ?
                           this.status.apSsid : this.status.staSsid);
        this.isConnected =
          (this.status.staSsid.length > 0 &&
           this.status.staIp !== '0.0.0.0' &&
           this.status.staSsid !== '0.0.0.0');
        connSsid
      })
      .catch(function (error) {
        console.log('error', error);
      });
    }
  }
</script>
