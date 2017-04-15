
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
    display: inline-block;
    width:320px;
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
</style>

<template lang="html">
  <div>
    <div id="left-controls">
      <div>
        Adjust the low and high parameters for the <br>
        best image with the fewest lines ...
      </div>
      <div>
        Low: <vue-slider class="slider" v-bind="sliderLow" v-model="lowThresh"></vue-slider>
      </div>
      <div>
        High: <vue-slider class="slider" v-bind="sliderHigh" v-model="highThresh"></vue-slider>
      </div>
    </div>
    <div id="right-controls">
      <div id="undo-label-line">
        <div id="undo-labl"> Undo<span class="arrow">&#x2190;</span> </div>
        <div id="redo-labl"> <span class="arrow">&#x2192;</span> Redo</div>
      </div>
      <vue-slider class="slider" v-bind="sliderUndo" v-model="undoPos"></vue-slider>
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
        sliderLow: {
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 255, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
          tooltip: 'hover', piecewise: false
				},
        sliderHigh: {
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 255, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
					tooltip: 'hover', piecewise: false
				},
        sliderUndo: {
					value: 20, width: 275, height: 8, dotSize: 20, min: 0, max: 255, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
					tooltip: 'hover', piecewise: false
				}
      }
  	},
    mounted: function () {
      var video  = document.getElementById('webcam');
      var canvas = document.getElementById('canvas');
      var gui, options, ctx, canvasWidth, canvasHeight, img_u8;
      try {
        compatibility.getUserMedia({video: true}, function(stream) {
          try {
            video.src = compatibility.URL.createObjectURL(stream);
          } catch (error) {
            video.src = stream;
          }
          video.addEventListener('canplay', canPlayListener, true);
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

      function canPlayListener() {
        video.removeEventListener('canplay', canPlayListener);
        setTimeout(function() {
          video.play();
          demo_app();
          compatibility.requestAnimationFrame(tick);
        }, 500);
      }
      function demo_app() {
          canvasWidth  = canvas.width;
          canvasHeight = canvas.height;
          ctx = canvas.getContext('2d');

          ctx.fillStyle = "rgb(0,255,0)";
          ctx.strokeStyle = "rgb(0,255,0)";

          img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);

          // stat.add("grayscale");
          // stat.add("gauss blur");
          // stat.add("canny edge");
      }

      function tick() {
          compatibility.requestAnimationFrame(tick);
          // stat.new_frame();
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
              ctx.drawImage(video, 0, 0, 640, 480);
              var imageData = ctx.getImageData(0, 0, 640, 480);

              // stat.start("grayscale");
              jsfeat.imgproc.grayscale(imageData.data, img_u8.data);
              // stat.stop("grayscale");

              var kernel_size = 16;

              // stat.start("gauss blur");
              jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
              // stat.stop("gauss blur");

              var low_threshold  = 20;
              var high_threshold = 50;

              // stat.start("canny edge");
              jsfeat.imgproc.canny(img_u8, img_u8, low_threshold|0, high_threshold|0);
              // stat.stop("canny edge");

              // render result back to canvas
              var data_u32 = new Uint32Array(imageData.data.buffer);
              var alpha = (0xff << 24);
              var i = img_u8.cols*img_u8.rows, pix = 0;
              while(--i >= 0) {
                  pix = img_u8.data[i];
                  data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
              }

              ctx.putImageData(imageData, 0, 0);

              // document.getElementById('log').innerHTML = stat.log();
          }
      }
      this.$root.$on("navBarChange", function(to, from) {
        console.log(to,from);
        if(from.path == 'ZDemo') {
          gui.close();
          video.pause();
          video.src=null;
        }
      });
    } // end mounted:
  }
</script>
