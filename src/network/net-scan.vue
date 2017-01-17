
<style lang="less" scoped>
  table {
    margin-top:5px;
    th { text-align: left; }
    td { padding:3px 5px; }
  }
  button {
    margin: 0 15px;
    cursor: pointer;
  }
  .rssi {
    text-align: center;
  }
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr">
      {{msg}}
      <button type="button" @click="refresh()" v-bind:disabled="isRstDisabled">
        Reset
      </button>
    </div>
    <div class="network-page-pane-body" v-if="isVisible">
      <table>
        <tr> <th></th><th>SSID</th><th>Strength</th> </tr>
        <tr v-for="ssid in ssids">
          <td><button type="button" @click="add(ssid.ssid)">Add</td>
          <td>{{ssid.ssid}}</td>
          <td class="rssi">{{ssid.rssi}}</td>
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
        isRstDisabled: false,
        ssids: []
      }
    },
    created: function() {
      this.refresh();
      console.log('dfg',this.msg);
     },
    methods: {
      refresh: function() {
        this.isRstDisabled = true;
        setTimeout(()=>{this.isRstDisabled=false}, 300);

        axios.get(window.dbgHost + '/ajax/ssid-scan')
        .then( (response) => {
          console.log('response data', response.data);
          let ssids = response.data;
          this.msg = ssids.length + " WiFi Access Points Found"
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
