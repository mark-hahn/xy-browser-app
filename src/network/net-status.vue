
<style lang="less" scoped>
  #noXyConn { color:red; }
  #spacer{height:6px; width:100%}
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr"> {{msg}} </div>
    <div class="network-page-pane-body">
      <div id="noXyConn" v-if="noXyConn">
        You have no connection to XY.
        If this persists unplug and replug XY and try again.
      </div>
      <ul v-show="isVisible">
        <li> XY is hosting the access point <b>{{status.apSsid}}</b>
                at <b>{{status.apIp}}</b>. </li>
        <li v-show="xyHasInternet">
             XY is connected to the access point <b>{{status.staSsid}}</b>
                at <b>{{status.staIp}} (http://xy.local)</b>.</li>
        <li v-show="!xyHasInternet">
             XY is not connected to any access point.</li>
        <li v-show="xyHasInternet">
             XY is connected to the internet. </li>
        <li v-show="!xyHasInternet">
             XY has no access to the internet. </li>
        <div id="spacer">&nbsp</div>
        <li>
          Your computer is connected to XY through <b>{{xyPcConnSsid}}</b>. </li>
        <li v-show="pcHasInternet">
          Your computer is connected to the internet. </li>
        <li v-show="!pcHasInternet">
          Your computer has no access to the internet. </li>
      </ul>
      <div v-show="!noXyConn && xyHasInternet && !pcHasInternet">
        Please note the access number <b>{{status.staIp}}</b>
        in case <b>xy.local</b> doesn't work.
      </div>
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
        xyHasInternet: false,
        pcHasInternet: false,
        noXyConn: false,
        xyPcConnSsid: ''
      }
    },
    methods: {
      refresh: function() {
        axios.get(window.dbgHost + '/ajax/wifi-status', {'timeout': 3000})
        .then( (response) => {
          if(this.noXyConn) window.eventBus.$emit('xyReconnected');
          this.noXyConn = false;
          console.log('response data', response.data[0]);
          this.status = response.data[0];
          for(let key in this.status)
            if(this.status[key] === '0.0.0.0') this.status[key] = "";
          this.msg = "Network status"
          this.isVisible = true;
          this.xyHasInternet = (this.status.staSsid.length > 0);
          this.xyPcConnSsid  = (this.status.reqFromAp ?
                                this.status.apSsid : this.status.staSsid);
          this.pcHasInternet = (!this.status.reqFromAp);
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
