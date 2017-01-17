
<style lang="less" scoped>
  table {
    margin-top:5px;
    th { text-align: left; }
    td { padding:3px 5px; }
  }
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr">
      {{msg}}
      <button type="button" @click="refresh()">Reset</button>
    </div>
    <div class="network-page-pane-body" v-if="isVisible">
      <table>
        <tr> <th></th><th>SSID</th><th>Strength</th> </tr>
        <tr v-for="ssid in ssids">
          <td><button type="button" @click="add(ssid.ssid)">Add</td>
          <td>{{ssid.ssid}}</td>
          <td>{{ssid.rssi}}</td>
          <td>{{ssid.encryptionType}}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
  import axios from 'axios'
  export default {
    name: 'NetScan',
    data: function () {
      return {
        msg: "Scanning WiFi access points ...",
        isVisible: false,
        ssids: []
      }
    },
    created: function() {
      this.refresh();
      console.log('dfg',this.msg);
     },
    methods: {
      refresh: function() {
        axios.get(window.dbgHost + '/ajax/ssid-scan')
        .then( (response) => {
          console.log('response data', response.data);
          this.msg = "WiFi Access Points Found"
          let ssids = response.data;
          for(let ssid of ssids)
              ssid.encryptionType = (ssid.encryptionType == 'NONE') ? "open" : "";
          ssids.sort((a,b) => b.rssi - a.rssi);
          this.ssids = ssids;
          this.isVisible = true;
        })
        .catch(function (error) {
          console.log('error', error);
        });
      },
      add: function (ssidName) {
        console.log("Add:",ssidName);
        window.eventBus.$emit('ssidAdd', ssidName);
      }
    }
  }
</script>
