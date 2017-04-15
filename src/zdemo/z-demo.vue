
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
</style>

<template lang="html">
  <div>
    <video id="webcam" width="640" height="480" style="display:none;"></video>
    <div style=" width:640px;height:480px;margin: 10px auto;">
        <canvas id="canvas" width="640" height="480"></canvas>
        <div id="no_rtc" class="alert alert-error" style="display:none;"></div>
        <div id="log" class="alert alert-info"></div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'zdemo',
    components: {},

    mounted: function () {
      var video  = document.getElementById('webcam');
      var canvas = document.getElementById('canvas');
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

      var stat = new profiler();

      var gui,options,ctx,canvasWidth,canvasHeight;
      var img_u8;

      var demo_opt = function(){
          this.blur_radius = 2;
          this.low_threshold = 20;
          this.high_threshold = 50;
      }
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

          options = new demo_opt();
          gui = new dat.GUI();

          gui.add(options, 'blur_radius', 0, 4).step(1);
          gui.add(options, 'low_threshold', 1, 127).step(1);
          gui.add(options, 'high_threshold', 1, 127).step(1);

          stat.add("grayscale");
          stat.add("gauss blur");
          stat.add("canny edge");
      }

      function tick() {
          compatibility.requestAnimationFrame(tick);
          stat.new_frame();
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
              ctx.drawImage(video, 0, 0, 640, 480);
              var imageData = ctx.getImageData(0, 0, 640, 480);

              stat.start("grayscale");
              jsfeat.imgproc.grayscale(imageData.data, img_u8.data);
              stat.stop("grayscale");

              var r = options.blur_radius|0;
              var kernel_size = (r+1) << 1;

              stat.start("gauss blur");
              jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
              stat.stop("gauss blur");

              stat.start("canny edge");
              jsfeat.imgproc.canny(img_u8, img_u8, options.low_threshold|0, options.high_threshold|0);
              stat.stop("canny edge");

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
    }, // end mounted:

    unmounted: function() {
      console.log("unmounted");

    } // end unmounted:
  }
</script>
