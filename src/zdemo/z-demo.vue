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
  var lines = [];
  var data_u32;

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
					value: 20, width: 255, height: 8, dotSize: 20, min: 0, max: 200, interval: 1,
					disabled: false, show: true, speed: 0.3, reverse: false, lazy: false,
          tooltip: 'hover', piecewise: false
				},
        sliderHigh: {
					value: 50, width: 255, height: 8, dotSize: 20, min: 0, max: 200, interval: 1,
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
        data_u32 = new Uint32Array(imageData.data.buffer);
        var alpha = (0xff << 24);
        var i = img_u8.cols*img_u8.rows, pix = 0;
                  while(--i >= 0) {
                      pix = img_u8.data[i];
                      if(pix<255)
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
        if(this.capturing) {
          this.capturing = false;
          this.processing = true;
          this.sliderLow.disabled = true;
          this.sliderHigh.disabled = true;
          this.freezeBtnText = "Restart";
          video.pause();
          this.process();
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

      // this runs when video is first frozen
      // it turns pixels into clean lines
      process: function() {
        // return;
        // opposite neighbors in distance order
        var oppNbrs = [
          [8,5,7,2,6,1,3], // 0
          [7,6,8,3,5,0,2], // 1
          [6,3,7,0,8,1,5], // 2
          [5,2,8,1,7,0,6], // 3
                     null, // 4
          [3,0,6,1,7,2,8], // 5
          [2,1,5,0,8,3,7], // 6
          [1,0,2,3,5,6,8], // 7
          [0,3,1,2,6,5,7]  // 8
        ];
        // take one step to neighbor
        var nbr2xy = (x,y,idx) => {
          switch(idx) {
            case 0: x--; y--; break;
            case 1:      y--; break;
            case 2: x++; y--; break;
            case 3: x--;      break;
            case 5: x++;      break;
            case 6: x--; y++; break;
            case 7:      y++; break;
            case 8: x++; y++; break;
          }
          return [x,y];
        }
        var idx2xy = (idx) => {
          var x = idx % 640;
          var y = (idx/640) | 0;
          return [x,y];
        }
        // return val if indexes are on same quarter of frame
        // this is used to check for unwanted wrapping
        var idxsAreClose = (idx1, idx2, val = 1) => {
          var x1,y1,x2,y2;
          [x1,y1] = idx2xy(idx1);
          [x2,y2] = idx2xy(idx2);
          if((x2-x1) > 320 || (x1-x2) > 320 ||
             (y2-y1) > 240 || (y1-y2) > 240)
            return 0;
          return val;
        }
        // get neighbor pix values
        var getNbrs = (x,y) => {
          var i = y*640+x;
          return [
            idxsAreClose(i, i-641, img_u8.data[i-641]),
            idxsAreClose(i, i-640, img_u8.data[i-640]),
            idxsAreClose(i, i-639, img_u8.data[i-639]),

            idxsAreClose(i, i-1, img_u8.data[i-1]),
            img_u8.data[i],
            idxsAreClose(i, i+1, img_u8.data[i+1]),

            idxsAreClose(i, i+639, img_u8.data[i+639]),
            idxsAreClose(i, i+640, img_u8.data[i+640]),
            idxsAreClose(i, i+641, img_u8.data[i+641])]
        }
        var findLineFromEndIdx = (idx) => {
          var x,y;
          [x,y] = idx2xy(idx);
          for(let i=0; i < lines.length; i++) {
            var line = lines[i];
            if(!line) continue;
            var len = line.length;
            if (line[0]     == x && line[1]     == y) return [i, line, false];
            if (line[len-2] == x && line[len-1] == y) return [i, line, true];
          }
          console.log("line for idx ",idx,", point", x, ",", y, "is missing");
        }
        // reverse order of pairs in line
        var revLin = (line) => {
          var newLine = [];
          for(let i = line.length-2; i >= 0; i -= 2)
            newLine = newLine.concat(line[i], line[i+1]);
          return newLine;
        }
        // find endpoints within two pixels of each other
        // and combine their lines
        // idx1 is a known endpoint
        var joinCloseLines = (idx1, idx2) => {
          if(idx1 == idx2 || img_u8.data[idx2] != END_PIX) return false;

          // are pixels on opposite edges of frame?
          // this can happen when neighbors wrap
          if(!idxsAreClose(idx1, idx2)) return false;

          // we need a new pixel if ends are two apart
          var dif = idx2-idx1;
          var newPixel = null;
          switch(dif) {
            case -2*640-2: case -2*640-1: case -1*640-2:
              newPixel = idx1-640-1; break;
            case -2*640:
              newPixel = idx1-640; break;
            case -2*640+1: case -2*640+2: case -1*640+2:
              newPixel = idx1-640+1; break;
            case -2:
              newPixel = idx1-1; break;
            case +2:
              newPixel = idx1+1; break;
            case 1*640-2: case 2*640-2: case 2*640-1:
              newPixel = idx1+640-1; break;
            case 1*640+2: case 2*640+1: case 2*640+2:
              newPixel = idx1+640+1; break;
            case 2*640:
              newPixel = idx1+640; break;
          }
          var newXY;
          if(newPixel != null) {
            newXY = idx2xy(newPixel);
            img_u8.data[newPixel] = INSIDE_PIX;
          } else newXY = [];

          img_u8.data[idx1] = INSIDE_PIX;
          img_u8.data[idx2] = INSIDE_PIX;
          var line1 = findLineFromEndIdx(idx1);
          var line2 = findLineFromEndIdx(idx2);
          // are these the two ends of one line?
          if(line1[0] == line2[0]) {
            lines[line1[0]] = line1[1].concat(newXY);
            return true;
          }
          // concat lines paying attention to ends
          var newLine;
          if(!line1[2] && !line2[2])       // front1(rev) | front2
            newLine = revLin(line1[1]).concat(newXY, line2[1]);
          else if(line1[2] && !line2[2])   // end1 | front2
            newLine = line1[1].concat(newXY, line2[1]);
          else if(!line1[2] && line2[2])   // end2 || front1
            newLine = line2[1].concat(newXY, line1[1]);
          else if(line1[2] && line2[2])    // end1 | end2(rev)
            newLine = line1[1].concat(newXY, revLin(line2[1]));
          img_u8.data[newLine[1]*640+newLine[0]]                               = END_PIX;
          img_u8.data[newLine[newLine.length-1]*640+newLine[newLine.length-2]] = END_PIX;
          lines[line1[0]] = newLine;
          delete lines[line2[0]];
          return true;
        }

        // img_u8.data values
        const PIX_OFF    = 0;
        const INSIDE_PIX = 1;
        const END_PIX    = 2;
        const PIX_ON     = 255;

        const RED    = 0xff0000ff;
        const GREEN  = 0xff00ff00;
        const YELLOW = 0xff00ffff;
        const BLUE   = 0xffff0000;
        const CYAN   = 0xffffff00;
        const BLACK  = 0xff000000;
        const WHITE  = 0xffffffff;

        var lineCnt = 0;
        var lines = [];

        // for debug
        var actualLineCount = () => {
          var cnt = 0;
          for(let line of lines)
            if(line) cnt++;
          return cnt;
        }
        var lineIsALoop = (line) => {
          let x1 = line[0];     let y1 = line[1];
          let len = line.length;
          let x2 = line[len-2]; let y2 = line[len-1];
          return (Math.abs(x2-x1) < 2 && Math.abs(y2-y1) < 2);
        }
        var dumpLine = (line) => {
          if(!line) {
            console.log("dumpLine: Line undefined");
            return;
          }
          console.log("Line is a loop:", lineIsALoop(line));
          for(let v = 0; v < line.length; v += 2) {
            let x = line[v];
            let y = line[v+1];
            let idx = y*640+x;
            let type;
            switch (img_u8.data[idx]) {
              case PIX_OFF:     type = "PIX_OFF";       break;
              case INSIDE_PIX:  type = "INSIDE_PIX";    break;
              case END_PIX:     type = "END_PIX";       break;
              case PIX_ON:      type = "PIX_ON";        break;
              default:          type = "BAD_TYPE: " + img_u8.data[idx];
            }
            console.log("%3d: %3d,%3d, %s", v/2, x, y, type);
          }
        }

        var showLines = () => {
          var color = GREEN;
          for(let line of lines) {
            if(!line) continue;
            color = (color == RED? GREEN : RED);
            for(let v = 0; v < line.length; v += 2) {
              let x = line[v];
              let y = line[v+1];
              let idx = y*640+x;

              if(img_u8.data[idx] != END_PIX &&
                 img_u8.data[idx] != INSIDE_PIX)
                console.log("line val not END_PIX or INSIDE_PIX");

              if(img_u8.data[idx] == END_PIX) {
                data_u32[idx] = (color == RED? CYAN : YELLOW);
                if(v != 0 && v != line.length-2) {
                  console.log("END_PIX in middle of line");
                  dumpLine(line);
                }
              }
              else {
                if(v == 0 || v == line.length-2) {
                  if(!lineIsALoop(line)) {
                    console.log("INSIDE_PIX at end of line");
                    dumpLine(line);
                  }
                }
                data_u32[idx] = color;
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        // find all lines and walk them
        var startX = 0, startY = 0;
        while(startY < 480) {
          // try new starting point
          var x = startX; var y = startY;

          var idx = y*640+x;
          if(img_u8.data[idx] == PIX_ON) {

            // we found a starting pix
            img_u8.data[idx] = END_PIX;
            lines[lineCnt] = [x,y];

            // walk
            let lastNbr = 3; // defaults to coming from the left
            let lastIdx = idx;
            while(true) {
              var nbrs = getNbrs(x,y);
              var foundNbr = false;
              // find furthest neighbor
              for (let nbr of oppNbrs[lastNbr]) {
                if(nbrs[nbr] == PIX_ON) {
                  let nbrX, nbrY;
                  [nbrX,nbrY] = nbr2xy(x,y,nbr);
                  let idx = nbrY*640+nbrX;
                  if(foundNbr) {
                    // delete neighbors not closest
                    // might delete wrap-around pix but who cares
                    if(img_u8.data[idx] == PIX_ON) {
                       img_u8.data[idx] = PIX_OFF;
                       data_u32[idx] = BLACK;
                     }
                    continue;
                  }
                  foundNbr = true;
                  lastNbr = 8 - nbr;
                  img_u8.data[idx] = INSIDE_PIX;
                  x = nbrX;
                  y = nbrY;
                  lines[lineCnt] = lines[lineCnt].concat(x,y);
                  lastIdx = idx;
                }
              }
              if(!foundNbr) {
                // at end of line
                img_u8.data[lastIdx] = END_PIX;
                // var line = lines[lineCnt];
                // ignore lines less than 3 pixels long
                // if(line.length < 6) {
                //   for(let v = 0; v < line.length; v += 2) {
                //     x = line[v];
                //     y = line[v+1];
                //     img_u8.data[y*640+x] = PIX_OFF;
                //     data_u32[y*640+x] = BLACK;
                //   }
                //   delete lines[lineCnt];
                // } else
                  lineCnt++;
                // showLines();
                break;
              }
            }
          }
          if(++startX == 640) {
            startX = 0;
            startY++;
          }
        }
        console.log("number of lines after scan:", lineCnt, ", actual:", actualLineCount());

        // find line pairs with close endpoints and join them
outer:  for(let idx = 0; idx < 640*480; idx++) {
          var n;
          if(img_u8.data[idx] != END_PIX) continue;
          for(n = idx-2*640-2; n <= idx-2*640+2; n++)
            if(joinCloseLines(idx, n)) continue outer;
          for(n = idx-1*640-2; n <= idx-1*640+2; n++)
            if(joinCloseLines(idx, n)) continue outer;
          for(n = idx-2;       n <= idx+2;       n++)
            if(joinCloseLines(idx, n)) continue outer;
          for(n = idx+1*640-2; n <= idx+1*640+2; n++)
            if(joinCloseLines(idx, n)) continue outer;
          for(n = idx+2*640-2; n <= idx+2*640+2; n++)
            if(joinCloseLines(idx, n)) continue outer;
        }

        console.log("number of lines at end:", lineCnt, ", actual:", actualLineCount());
        showLines();
        this.processing = false;
      }
    }
  }
</script>
