
<style lang="less" scoped>
  table {
    margin-top:5px;
    th { text-align: left; }
    td {
      padding:3px 5px;
    }
  }
  button {
    margin: 0 15px;
  }
  .err-list{
    margin-top:5px;
    color:red;
  }
</style>

<template lang="html">
  <div id="top" class="network-page-pane">
    <div class="network-page-pane-hdr"> {{msg}} </div>
    <div class="network-page-pane-body">
      <form action="" v-show="isVisible">
        <h4>XY AP settings</h4>
        <table>
          <tr> <th>SSID</th> <th>Password</th> </tr>
          <tr>
            <td><input v-model.trim="ssids[0].apSsid">
            <td><input type="password" v-model.trim="ssids[0].apPwd">
          </tr>
        </table>
        <h4>Other AP settings</h4>
        <table>
          <tr> <th>SSID</th> <th>Password</th> </tr>
          <tr v-for="(ssid,idx) of ssids" v-if="idx>0">
            <td><input v-model.trim="ssid.ssid">
            <td><input type="password" v-model.trim="ssid.password">
          </tr>
        </table>
        <button type="button" @click="submit()">Save</button>
        <button type="button" @click="refresh()">Reset</button>
        <div class="err-list" v-if="errors.length>0">
          <ul>
            <li v-for="msg of errors"> {{msg}} </li>
          </ul>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
  import axios from 'axios'
  export default {
    name:'NetSettings',
    data: function () {
      return {
        msg: "Loading WiFi Settings ...",
        ssids: [{},{},{},{},{}],
        isVisible: false,
        errors: [],
        hasSsidErr: false,
        hasPwdErr: false
      }
    },
    created: function()  {
      this.$watch('ssids', function(newSsids) {
        this.errors     = [];
        this.hasSsidErr = false;
        this.hasPwdErr  = false;
        this.valSsid(newSsids[0].apSsid);
        this.valPwd(newSsids[0].apPwd);
      }, {deep:true});
      this.refresh();
    },
    methods: {
      valSsid: function(newSsid) {
        if(!this.hasSsidErr && newSsid === "") {
          this.errors.push("XY AP SSID is required");
          this.hasSsidErr = true;
        };
      },
      valPwd: function(newPwd) {
        if(!this.hasSsidErr && this.hasPwdErr) return;
        if(newPwd === "" || newPwd.length < 8) {
          this.errors.push("XY AP Password must be 8 chars or more");
          this.hasPwdErr = true;
          return false;
        };
        return true;
      },
      refresh: function() {
        axios.get(window.dbgHost + '/ajax/get-eeprom')
        .then( (response) => {
          console.log('response data', response.data);
          this.msg = "WiFi Settings."
          this.ssids = response.data;
          this.isVisible = true;
        })
        .catch(function (error) {
          console.log('error', error);
        });
      },
      submit: function() {

      }
    }
  }
</script>
