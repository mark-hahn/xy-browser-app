<!-- global -->
<style lang="less">
  .zdemo-page-pane {
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
    width:50%;
    font-weight: bold;
  }
  #right-controls {
    padding-left:40px;
    float:right;
    width:50%;
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
  .button {
    margin-top:15px;
    font-weight: bold;
    font-size: 14px;
    margin-right:25px;
  }
  #leftBtn {
    float:right;
  }
  #rightBtn {
    float:right;
  }
  .status {
    color:gray;
  }
  .status-sel {
    color:black;
    font-weight:bold;
  }
  canvas {
    border: 1px solid gray;
  }
</style>

<template lang="html">
  <div class="zdemo-page-pane">
    <div id="left-controls">
      <div id="left-capturing" v-if="capturing">
        <div>
          Fiddle with these parameters for the best image.
        </div>
        <div>
          Low: <vue-slider class="slider"
                 v-bind="sliderLow" v-model="lowThresh"></vue-slider>
        </div>
        <div>
          High: <vue-slider class="slider"
                  v-bind="sliderHigh" v-model="highThresh"></vue-slider>
        </div>
      </div>

      <div id="left-processing" v-if="processing">
        <div>
          Processing ...
        </div>
      </div>

      <div id="left-pruning" v-if="pruning">
        <div>
          Adjust slider to remove small lines.
        </div>
        <div>
          <vue-slider class="slider" v-on:callback="pruneChange"
                 v-bind="sliderPrune" v-model="pruneThresh"></vue-slider>
        </div>
      </div>

      <div id="left-deleting" v-if="deleting">
        <div>
          Click and drag on the image to manually delete lines.
        </div>
        <div  v-if="deletedCount > 0">
          Undo: <vue-slider class="slider" v-on:callback="undoChange"
                 v-bind="sliderUndo" v-model="undoValue"></vue-slider>
        </div>
      </div>

      <div id="left-saving" v-if="saving">
        <div>
          Enter name for saved image.  Usually a person's name.
        </div>
        <div>
          <input>
        </div>
      </div>
    </div>

    <div id="right-controls">
      <div id="right-status">
        <div class="status" v-bind:class="{'status-sel':capturing}">1) Adjust Image For Snapshot</div>
        <div class="status" v-bind:class="{'status-sel':pruning}">2) Remove Small Lines</div>
        <div class="status" v-bind:class="{'status-sel':deleting}">3) Manually Delete Lines</div>
        <div class="status" v-bind:class="{'status-sel':saving}">4) Name And Save Image</div>
      </div>

      <div id="buttons">
        <button class="button" type="button" id="rightBtn"
          v-on:click="rightClick">{{rightBtnText}}</button>
          <button class="button" type="button" id="leftBtn" v-if="!capturing"
          v-on:click="leftClick">Restart</button>
      </div>
    </div>

    <video id="webcam" width="640" height="480" style="display:none"></video>
    <div style="width:640px; height:480px;">
        <canvas id="canvas"
          v-on:mousemove="delMouseMove"
          v-on:mouseover="delMouseover"
          v-on:mouseout="delMouseout"
          width="640" height="480"></canvas>
    </div>
  </div>
</template>

<script>
  import vueSlider from 'vue-slider-component';

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

  var video, canvas, ctx, img_u8, imageData,
      lines = [], lineCnt = 0, lineTooSmall = [], lineIdx = [],
      lineDeleted = [], imageData_u32;

  var actualLineCount = () => {
    var cnt = 0;
    for(let i=0; i < lines.length; i++) {
      let line = lines[i];
      if(line && !lineTooSmall[i] && !lineDeleted[i]) cnt++;
    }
    return cnt;
  }

  export default {
    name: 'zdemo',
    components: {vueSlider},
    data: function() {
  		return {
        lowThresh: 20,
        highThresh: 50,
        pruneThresh: 20,
        deletedCount: 0,
        undoValue: 0,
        capturing: true,
        processing: false,
        pruning: false,
        deleting: false,
        saving: false,
        name: "Untitled",
        rightBtnText: "Snap Image",
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
        sliderPrune: {
					value: 15, width: 255, height: 8, dotSize: 20,
          min: 0, max: 50, interval: 1, disabled: false,
          show: true, speed: 0.3, reverse: false,
          lazy: false, tooltip: 'hover', piecewise: false
				},
        sliderUndo: {
					value: 0, width: 255, height: 8, dotSize: 20,
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
      drawLines: function() {
        imageData_u32.fill(WHITE);
        for(let i=0; i < lines.length; i++) {
          let line = lines[i];
          if(!line || lineTooSmall[i] ||
             (lineDeleted[i] && lineDeleted[i] <= this.undoValue))
            continue;
          for(let v = 0; v < line.length; v += 2) {
            let x = line[v];
            let y = line[v+1];
            imageData_u32[y*640+x] = BLACK;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      },
      demo_app: function () {
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";
        img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
      },
      processVideoFrame: function () {
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
        imageData_u32 = new Uint32Array(imageData.data.buffer);
        var i = 640*480, pix = 0;
        while(--i >= 0) {
            if(img_u8.data[i] < 255) imageData_u32[i] = WHITE;
            else                     imageData_u32[i] = BLACK;
        }
        ctx.putImageData(imageData, 0, 0);
      },
      tick: function() {
        if(!this.capturing) return;
        compatibility.requestAnimationFrame(this.tick);
        if (video.readyState === video.HAVE_ENOUGH_DATA)
          this.processVideoFrame();
      },
      canPlayListener: function () {
        video.removeEventListener('canplay', this.canPlayListener);
        setTimeout(() => {
          video.play();
          this.demo_app();
          compatibility.requestAnimationFrame(this.tick);
        }, 500);
      },
      pruneChange: function(pruneThresh) {
        // remove small lines
        for(let i=0; i < lines.length; i++) {
          let line = lines[i];
          if(!line) continue;
          lineTooSmall[i] = false;
          let maxX = Math.max(); let maxY = Math.max();
          let minX = Math.min(); let minY = Math.min();
          for(let v = 0; v < line.length; v += 2) {
            let x = line[v];
            let y = line[v+1];
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
          }
          if(Math.abs(maxX-minX) < pruneThresh &&
             Math.abs(maxY-minY) < pruneThresh) {
            lineTooSmall[i] = true;
          }
        }
        this.drawLines();
        console.log("number of lines after pruning small lines:", actualLineCount());
      },
      leftClick: function() {
        // restart
        lines = [];
        lineTooSmall = [];
        lineDeleted = [];
        this.processing = false;
        this.pruning    = false;
        this.deleting   = false;
        this.saving     = false;
        this.capturing  = true;
        this.rightBtnText = "Snap Image";
        video.play();
        this.tick();
      },
      rightClick: function() {
        if(this.capturing) {
          this.capturing = false;
          this.processing = true;
          video.pause();
          setTimeout( () => {
            this.process();
            this.drawLines();
          }, 500);
        } else if (this.pruning) {
          this.pruning = false;
          this.deleting = true;
          this.rightBtnText = "Next";
          this.sliderUndo.max = 0;
          lineIdx = [];
          lineDeleted = [];
          this.deletedCount = 0;
          for(let i=0; i < lines.length; i++) {
            let line = lines[i];
            if(!line) continue;
            for(let v = 0; v < line.length; v += 2) {
              let x = line[v];
              let y = line[v+1];
              let idx = y*640+x;
              lineIdx[idx] = i;
            }
          }
        }
      },
      delMouseover: function(event) {
        document.body.style.cursor = "cell";
      },
      delMouseout: function(event) {
        document.body.style.cursor = "auto";
      },
      delMouseMove: function(event) {
        if(event.buttons != 1) return;
        let x = event.offsetX;
        let y = event.offsetY;
        for(let x1=x-4; x1 < x + 4; x1++) {
          for(let y1=y-4; y1 < y + 4; y1++) {
            let mouseIdx = y1*640+x1;
            let lineNum = lineIdx[mouseIdx];
            if(lineNum && img_u8.data[mouseIdx] != PIX_OFF &&
                (!lineDeleted[lineNum] || lineDeleted[lineNum] > this.undoValue)) {
              // delete line
              if(this.undoValue < this.sliderUndo.max) {
                for(let i = this.undoValue+1; i < this.deletedCount; i++)
                  delete lineDeleted[lineNum];
                this.deletedCount = this.undoValue;
              }
              lineDeleted[lineNum]  = this.deletedCount;
              this.sliderUndo.max   = this.deletedCount
              this.sliderUndo.value = this.deletedCount;
              this.deletedCount++;
              let line = lines[lineNum];
              for(let v = 0; v < line.length; v += 2) {
                let x = line[v];
                let y = line[v+1];
                let idx = y*640+x;
                img_u8.data[idx] = PIX_OFF;
                imageData_u32[idx] = WHITE;
              }
              this.drawLines();
            }
          }
        }
      },
      undoChange: function(val) {
        console.log("undo:", val);
        this.undoValue = val;
        this.drawLines();
      },

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
                       imageData_u32[idx] = BLACK;
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
                lineCnt++;
                break;
              }
            }
          }
          if(++startX == 640) {
            startX = 0;
            startY++;
          }
        }
        console.log("number of lines after scan:", actualLineCount());

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
        console.log("number of lines after join:", actualLineCount());

        // done processing
        lineTooSmall = [];
        lineDeleted = [];
        this.deletedCount = 0;
        this.pruneThresh = 20;
        this.pruneChange(20);
        this.processing = false;
        this.pruning = true;
        this.rightBtnText = "Next";
      }
    }
  }
</script>
