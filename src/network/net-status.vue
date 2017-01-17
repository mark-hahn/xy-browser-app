
<style lang="less" scoped>
  #noXyConn { color:red; }
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr"> {{msg}} </div>
    <div class="network-page-pane-body">
      <div id="noXyConn" v-if="noXyConn">
        The connection to the XY has been lost
      </div>
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
    name:'NetStatus',
    data: function () {
      return {
        status: { apSsid:'', apIp:'', staIp:'', staSsid:'' },
        msg: "Checking network status ...",
        isVisible: false,
        isConnected: false,
        noXyConn: false,
        connSsid: ''
      }
    },
    methods: {
      refresh: function() {
        axios.get(window.dbgHost + '/ajax/wifi-status', {'timeout': 1000})
        .then( (response) => {
          if(this.noXyConn) window.eventBus.$emit('xyReconnected');
          this.noXyConn = false;
          this.isVisible = true;
          console.log('response data', response.data[0]);
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
        })
        .catch( (error) => {
          console.log('error', error);
          this.noXyConn = true;
          this.isVisible = false;
        });
      }
    },
    created: function() {
      this.refresh();
      if(!this.statInterv)
        this.statInterv =
          setInterval(()=> {this.refresh()}, 4000);
    },
    beforeDestroy: function() {
      if(this.statInterv) clearInterval(this.statInterv);
      this.statInterv = null;
    }
  }
</script>
