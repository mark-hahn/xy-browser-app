<!-- global -->
<style lang="less">
  .zdemo-page-pane {
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

<style lang="less" scoped>
  #log {height:20px;}
  #canvas {margin-top: 20px;}
  .slider {
    display:inline-block;
    position: relative;
    top: 10px;
  }
  #left-controls {
    position: relative;
    display: inline-block;
    width:320px;
  }
  #slidersMask {
    position:absolute;
    top:0px;
    width:100%;
    height:100%;
    background-color: rgba(255,255,255,0.5);
  }
  #right-controls {
    display: inline-block;
    width:300px;
    margin-left:25px;
  }
  .arrow {
    position:relative;
    top: 3px;
    font-size:30px;
  }
  #undo {
    position:relative;
    top: -25px;
  }
  #undo-label-line {
    position:relative;
    top: 10px;
    left:5px;
  }
  #undo-labl{
    width:100px;
    display: inline-block;
    float:left;
  }
  #redo-labl{
    width:100px;
    display: inline-block;
    float:right;
  }
  .editmsg {
    position:relative;
    font-weight: bold;
    top: 30px;
    left:30px;
    color: gray;
  }
  .button {
    position:relative;
    top:-20px;
    font-weight: bold;
    font-size: 14px;
    font-weight: bold;
    margin-left:25px;
  }
</style>

<template lang="html">
  <div>
    <div id="left-controls">
      <div>
        Adjust the low and high parameters for the <br>
        best image with the fewest lines ...
      </div>
      <div>
        Low: <vue-slider class="slider"
                         v-bind="sliderLow" v-model="lowThresh"
                         v-on:callback="lowChange"></vue-slider>
      </div>
      <div>
        High: <vue-slider class="slider"
                          v-bind="sliderHigh" v-model="highThresh"
                          v-on:callback="highChange"></vue-slider>
      </div>
      <div id="slidersMask" v-if="!capturing"></div>
    </div>

    <div id="right-controls">
      <div id="undo" v-if="!capturing && !processing && undoCount > 0">
        <div id="undo-label-line">
          <div id="undo-labl"> Undo<span class="arrow">&#x2190;</span> </div>
          <div id="redo-labl"> <span class="arrow">&#x2192;</span> Redo</div>
        </div>
        <vue-slider class="slider"
                    v-bind="sliderUndo" v-model="undoPos"
                    v-on:callback="undoChange"></vue-slider>
      </div>
      <div id="buttons">
        <div class="editmsg" v-if="!capturing && !processing">
          Click and drag to delete lines.
        </div>
        <div class="editmsg" v-if="processing">
          Processing ...
        </div>
        <button class="button" type="button" id="freezeBtn"
                v-on:click="freezeClick">{{freezeBtnText}}</button>
        <button class="button" type="button" id="doneBtn"
                v-on:click="doneClick"
                v-bind:disabled="capturing || processing">Finished</button>
      </div>
    </div>

    <video id="webcam" width="640" height="480" style="display:none;"></video>
    <div style=" width:640px;height:480px;">
        <canvas id="canvas" width="640" height="480"></canvas>
        <div id="no_rtc" class="alert alert-error" style="display:none;"></div>
        <div id="log" class="alert alert-info"></div>
    </div>
  </div>
</template>

<script>
  import vueSlider from 'vue-slider-component';

  export default {
    name: 'zdemo',
    components: {vueSlider},
    data: function() {
  		return {
        lowThresh: 0,
        highThresh: 0,
        undoPos: 0,
        undoCount: 0,
        capturing: true,
        processing: false,
        freezeBtnText: "Freeze",
        video: null,
        canvas: null,
        ctx: null,
        img_u8: null,
        imageData: null,
        sliderLow: {
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 100, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
          tooltip: 'hover', piecewise: false
				},
        sliderHigh: {
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 100, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
					tooltip: 'hover', piecewise: false
				},
        sliderUndo: {
					value: 0, width: 275, height: 8, dotSize: 20,
          min: 0, max: 0, interval: 1, disabled: false,
          show: true, speed: 0.3, reverse: false,
          lazy: false, tooltip: 'hover', piecewise: false
				}
      }
  	},
    mounted: function () {
      this.video  = document.getElementById('webcam');
      this.canvas = document.getElementById('canvas');
      try {
        compatibility.getUserMedia({video: true}, (stream) => {
          try {
            this.video.src = compatibility.URL.createObjectURL(stream);
          } catch (error) {
            this.video.src = stream;
          }
          this.video.addEventListener('canplay', this.canPlayListener, true);
        }, function (error) {
            document.getElementById('webcam').style.display = 'none';
            document.getElementById('canvas').style.display = 'none';
            document.getElementById('log').style.display = 'none';
            document.getElementById('no_rtc').style.display = 'none';
            document.getElementById('log').innerHTML = '<h4>WebRTC not available.</h4>';
            document.getElementById('no_rtc').style.display = 'block';
        });
      } catch (error) {
            document.getElementById('canvas').style.display = 'none';
            document.getElementById('log').style.display = 'none';
            document.getElementById('log').innerHTML = '<h4>WebRTC not available.</h4>';
            document.getElementById('no_rtc').style.display = 'block';
      }
      // var stat = new profiler();

      this.$root.$on("navBarChange", function(to, from) {
        console.log(to,from);
        if(from.path == 'ZDemo') {
          this.video.pause();
          this.video.src=null;
        }
      });
    }, // end mounted:
    methods: {
      demo_app: function () {
        this.ctx = this.canvas.getContext('2d');
        this.ctx.fillStyle = "rgb(0,255,0)";
        this.ctx.strokeStyle = "rgb(0,255,0)";
        this.img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
      },
      processFrame: function () {
        this.ctx.drawImage(this.video, 0, 0, 640, 480);
        this.imageData = this.ctx.getImageData(0, 0, 640, 480);

        jsfeat.imgproc.grayscale(this.imageData.data, this.img_u8.data);

        var kernel_size = 16; // (radius+1)^2
        jsfeat.imgproc.gaussian_blur(this.img_u8, this.img_u8, kernel_size, 0);

        var low_threshold  = (this.lowThresh  > this.highThresh ?
                              this.highThresh : this.lowThresh);
        var high_threshold  = (this.lowThresh > this.highThresh ?
                              this.lowThresh  : this.highThresh);
        jsfeat.imgproc.canny(this.img_u8, this.img_u8,
                             low_threshold|0, high_threshold|0);

        // render result back to canvas
        var data_u32 = new Uint32Array(this.imageData.data.buffer);
        var alpha = (0xff << 24);
        var i = this.img_u8.cols*this.img_u8.rows, pix = 0;
        while(--i >= 0) {
            pix = this.img_u8.data[i];
            data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
        this.ctx.putImageData(this.imageData, 0, 0);
      },
      tick: function() {
        if(!this.capturing) return;
        compatibility.requestAnimationFrame(this.tick);
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA)
          this.processFrame();
      },
      canPlayListener: function () {
        this.video.removeEventListener('canplay', this.canPlayListener);
        setTimeout(() => {
          this.video.play();
          this.demo_app();
          compatibility.requestAnimationFrame(this.tick);
        }, 500);
      },
      lowChange: function(val) {
        // console.log("low:", val);
        // if(!this.capturing ) this.processFrame();
      },
      highChange: function(val) {
        // console.log("high:", val);
        // if(!this.capturing) this.processFrame();
      },
      undoChange: function(val) {
        console.log("undo:", val);
      },
      freezeClick: function() {
        console.log("fc", this.capturing);
        if(this.capturing) {
          this.capturing = false;
          this.processing = true;
          this.sliderLow.disabled = true;
          this.sliderHigh.disabled = true;
          this.freezeBtnText = "Restart";
        }
        else if(!this.capturing) {
          this.processing = false;
          this.capturing = true;
          this.sliderLow.disabled = false;
          this.sliderHigh.disabled = false;
          this.freezeBtnText = "Freeze";
          this.tick();
        }
      },
      doneClick: function() {
      },
      maskClick: function() {
        return false;
      }
    }
  }
</script>
