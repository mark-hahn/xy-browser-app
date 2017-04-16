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

  var video, canvas, ctx, img_u8, imageData;

  export default {
    name: 'zdemo',
    components: {vueSlider},
    data: function() {
  		return {
        lowThresh: 20,
        highThresh: 50,
        undoPos: 0,
        undoCount: 0,
        capturing: true,
        processing: false,
        freezeBtnText: "Freeze",
        sliderLow: {
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 100, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
          tooltip: 'hover', piecewise: false
				},
        sliderHigh: {
					value: 50, width: 255, height: 8, dotSize: 20, min: 0, max: 100, interval: 1,
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
      video  = document.getElementById('webcam');
      canvas = document.getElementById('canvas');
      try {
        compatibility.getUserMedia({video: true}, (stream) => {
          try {
            video.src = compatibility.URL.createObjectURL(stream);
          } catch (error) {
            video.src = stream;
          }
          video.addEventListener('canplay', this.canPlayListener, true);
        }, function (error) {
          console.log("WebRTC not available");
        });
      } catch (error) {
        console.log("WebRTC not available");
      }
      this.$root.$on("navBarChange", function(to, from) {
        if(from.path == 'ZDemo') video.pause();
        if(to.path   == 'ZDemo') video.play();
      });
    }, // end mounted:
    methods: {
      demo_app: function () {
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";
        img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
      },
      processFrame: function () {
        ctx.drawImage(video, 0, 0, 640, 480);
        imageData = ctx.getImageData(0, 0, 640, 480);

        jsfeat.imgproc.grayscale(imageData.data, img_u8.data);

        var kernel_size = 4; // (radius+1)^2
        jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);

        var low_threshold  = (this.lowThresh  > this.highThresh ?
                              this.highThresh : this.lowThresh);
        var high_threshold  = (this.lowThresh > this.highThresh ?
                              this.lowThresh  : this.highThresh);
        jsfeat.imgproc.canny(img_u8, img_u8,
                             low_threshold|0, high_threshold|0);

        // render result back to canvas
        var data_u32 = new Uint32Array(imageData.data.buffer);
        var alpha = (0xff << 24);
        var i = img_u8.cols*img_u8.rows, pix = 0;
                  while(--i >= 0) {
                      pix = img_u8.data[i];
                      if(pix>0)
                        data_u32[i] = 0xff000000;
                      else
                        data_u32[i] = 0xffffffff;
                  }
        ctx.putImageData(imageData, 0, 0);
      },
      tick: function() {
        if(!this.capturing) return;
        compatibility.requestAnimationFrame(this.tick);
        if (video.readyState === video.HAVE_ENOUGH_DATA)
          this.processFrame();
      },
      canPlayListener: function () {
        video.removeEventListener('canplay', this.canPlayListener);
        setTimeout(() => {
          video.play();
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
          video.pause();

          var data_u32 = new Uint32Array(imageData.data.buffer);
          var alpha = (0xff << 24);
          var i = img_u8.cols*img_u8.rows, pix = 0;
          while(--i >= 0) {
              pix = img_u8.data[i];
              if(pix>0)
                data_u32[i] = 0xffff0000;
              else
                data_u32[i] = 0xffffffff;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        else if(!this.capturing) {
          this.processing = false;
          this.capturing = true;
          this.sliderLow.disabled = false;
          this.sliderHigh.disabled = false;
          this.freezeBtnText = "Freeze";
          video.play();
          this.tick();
        }
      },
      doneClick: function() {
      },
      maskClick: function() {},
      process: function() {

      }
    }
  }
</script>
