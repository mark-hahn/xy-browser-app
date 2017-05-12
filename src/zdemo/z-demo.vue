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
  #name-inp {
    margin-top:15px;
  }
  #save-btn {
    float:right;
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
          Name the image.  Usually it would be your name.
        </div>
        <div>
          <input id="name-inp" v-bind:value="nameText">
        </div>
        <div>
          <button class="button" type="button" id="save-btn"
            v-on:click="saveClick">Save To Print Queue</button>
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
        <button class="button" type="button" id="rightBtn" v-if="!saving"
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
      lineDeleted = [], imageData_u32, paths = [];

  var actualLineCount = () => {
    var cnt = 0;
    for(let i=0; i < lines.length; i++) {
      let line = lines[i];
      if(line && !lineTooSmall[i] && !lineDeleted[i]) cnt++;
    }
    return cnt;
  }

  // dist = Math.abs((x2-x1)*(y1-y)-(x1-x)*(y2-y1)) /
  //        Math.sqrt((x2-x1)^2 + (y2-y1)^2);
  // line in is from lftIdx to end

  let firstPointFarFromLine = (line, lftIdx, rgtIdx) => {
    let x1 = line[lftIdx],   y1 = line[lftIdx+1];
    let x2 = line[rgtIdx-2], y2 = line[rgtIdx-1];
    let xdif = x2-x1, xdifsq = xdif * xdif;
    let ydif = y2-y1, ydifsq = ydif * ydif;
    let sqrtdifsq = Math.sqrt(xdifsq + ydifsq);
    let dist2line = (x,y) =>
        Math.abs(xdif*(y1-y)-ydif*(x1-x))/sqrtdifsq;
    let maxDist = Math.max(), maxIdx;
    for(let idx=lftIdx+2; idx < rgtIdx-2; idx += 2) {
      let dist = dist2line(line[idx], line[idx+1]);
      if(dist > maxDist) {
        maxDist = dist;
        maxIdx = idx;
      }
    }
    return [maxIdx, maxDist];
  }

const MAX_DIST = 1.3;

  let bisectLine = (path, line, lftIdx, rgtIdx) => {
    let [maxIdx, maxDist] = firstPointFarFromLine(line, lftIdx, rgtIdx);
    if(maxDist <= MAX_DIST) {
      if(rgtIdx < line.length) path[path.length] = rgtIdx;
    } else {
      bisectLine(path, line, lftIdx, maxIdx);
      bisectLine(path, line, maxIdx, rgtIdx);
    }
  }
  let pps2usecs = (pps => Math.round(1e6/pps));

  const tgtMmSec     = 100;  // max speed mm/sec
  const imageWid     = 160; // canvas in mm
  const fullStepsMM  = 5;
  const distUnit     = 32*fullStepsMM;
  const imageOfsX    = 40 * distUnit;  // 40 mm
  const imageOfsY    = 40 * distUnit;
  const scale = Math.floor(((5.5 * 25.4) * distUnit) / 640); // drawing is 5.5" wide
  const accel = 2;
  const jerk  = 10;
  const maxPps = 3000;
  const X = 0, Y = 1;
  const fwd = 1, still = 0, bwd = -1;

  let exportData = "";

  let emitAccel = () => {
    exportData += 'A' + accel + '\n';
  }
  let emitHome = () => {
    exportData += 'H\n';
    return 2e6; // 2 secs to home
  }
  let emitLift = () => {
    exportData += '^\n';
    return 0.5e6; // half-sec to lift pen
  }
  let emitDrop = () => {
    exportData += 'v\n';
    return 0.5e6; // half-sec to drop pen
  }
  let emitDelay = (axis, usecs) => {
    exportData += (axis == X ? 'D' : 'E') + Math.round(usecs) + '\n';
  }
  let emitUstep = (axis, ustep, pulseCount, pps) => {
    exportData += (axis == X ? 'U' : 'V') + ustep + ',' +
                   pulseCount + ',' + Math.round(pps*8) + '\n';
  }
  let emitVector = (axis, dir, pulseCount, pps) => {
    // pps is uint16_t fixed-point 13.3
    exportData += (axis == X ? 'X' : 'Y')  +
                  (dir == fwd ? 'F' : 'B') + pulseCount + ',' +
                  Math.round(pps*8) + '\n';
  }

  let accelPulsesTime = (pps1, pps2, ustep) => {
    if(pps1 == pps2) return [0,0];
    let lastUsecs = pps2usecs(pps1), currentPps = pps1;
    let pulseCount = 0, usecs = 0;
    while(true) {
      let ppsChange = Math.floor(lastUsecs >> (10 - accel - ustep));
      if(ppsChange > 327) ppsChange == 327;
      if(pps2 < pps1) {
        // deccelerate
        if(ppsChange == 0 || ppsChange > currentPps || (currentPps - ppsChange) <= pps2)
          return [pulseCount, usecs];
        else {
          pulseCount++;
          currentPps -= ppsChange;
          lastUsecs = pps2usecs(currentPps);
          usecs += lastUsecs;
        }
      }
      else {
        // accelerate
        if(ppsChange == 0 || (currentPps + ppsChange) >= pps2)
          return [pulseCount, usecs];
        else {
          pulseCount++;
          currentPps += ppsChange;
          lastUsecs = pps2usecs(currentPps);
          usecs += lastUsecs;
        }
      }
    }
  }

  // calculate ustep, pulsecount, pps, and usecs for distance and in/out vel
  // dist is mm, vel is mm/sec
  // if pps change cannot be made in given distance, then return null
  let chkAccelInDist = (x1, x2, vel1, vel2, lastUstep, vecStop) => {
    let dist = Math.abs(x2-x1);
    let accelPulses = 0, accelUsecs = 0, accelPulses2 = 0, accelUsecs2 = 0;
    vel1 = Math.max(vel1, jerk);
    vel2 = Math.max(vel2, jerk);

    for(let ustep = 5; ustep >= 0; ustep--) {
      if(ustep == lastUstep+1) ustep--;
      let pps1 = fullStepsMM * (vel1 << ustep);
      let pps2 = fullStepsMM * (vel2 << ustep);
      if(pps1 > maxPps || pps2 > maxPps) continue;
      // check if new ustep is compatible with old
      let ustepPulses = 0, ustepDist = 0, ustepUsecs = 0;
      if(ustep < lastUstep) {
        let lastDistPerPulse = (1 << (5-lastUstep));
        while(((x1 + ustepDist) & (0x1f >> ustep)) != 0) {
          ustepPulses++;
          ustepDist = ustepPulses * lastDistPerPulse;
          if(x2 < x1) ustepDist = -ustepDist;
          ustepUsecs = ustepPulses * pps2usecs(pps1);
        }
      }
      let ppsJerk = fullStepsMM * (jerk << ustep);
      let stepsPerMM = fullStepsMM << ustep;
      [accelPulses, accelUsecs] = accelPulsesTime(pps1, pps2, ustep);
      let accelDist = accelPulses / stepsPerMM, accelDist2 = 0;
      if(vecStop) {
        [accelPulses2, accelUsecs2] = accelPulsesTime(pps2, ppsJerk, ustep);
        accelDist2 = accelPulses2 / stepsPerMM;
      }
      if(ustepDist + accelDist + accelDist2 <= dist) {
        return [ustepPulses, ustepDist, ustepUsecs,
                accelDist,  accelUsecs, ustep, vel2,
                accelDist2, accelUsecs2];
      }
      // failed to fit change in dist, try slower velocity
      vel2 -= jerk;
      if(vel2 >= jerk) {
        ustep = 6;
        continue;
      }
    }
    return null;
  }

  let planAxis = (actionArr) => {
    for(let aIdx = 0; aIdx < actionArr.length;) {
      let a = actionArr[aIdx];
      if(a.vel == 0 || a.extra) {aIdx++; continue;}

      let vecStop = aIdx == actionArr.length-1 || actionArr[aIdx+1].vel == 0 ||
                                                  actionArr[aIdx+1].dir != a.dir;
      let dist = Math.abs(a.pos2 - a.pos1);
      let lastVel   = (aIdx == 0 ? 0    : actionArr[aIdx-1].vel);
      let lastUstep = (aIdx == 0 ? null : actionArr[aIdx-1].ustep);

      let chk = chkAccelInDist(a.pos1, a.pos2, lastVel, a.vel, lastUstep, vecStop);
      if(!chk) {
        if(aIdx == 0 || actionArr[aIdx-1].vel == 0) {
          console.log("failed to process action array at:", aIdx, actionArr);
          debugger;
          return false;
        }
        let curVel = (a.vel == 0 ? jerk : a.vel);
        a = actionArr[--aIdx];
        a.vel = (a.vel + curVel) / 2;
        continue; // restart at previous vec with new closer velocity
      }
      let  [ustepPulses, ustepDist, ustepUsecs,
            accelDist,  accelUsecs, ustep, vel,
            accelDist2, accelUsecs2] = chk;

      let stepsPerMM = fullStepsMM << ustep;
      let nonAccelDist = dist - ustepDist - accelDist - accelDist2;
      a.usecs = ustepUsecs + accelUsecs + accelUsecs2 +
                (nonAccelDist / (distUnit*vel)) * 1e6;
      a.ustep       = ustep;
      a.pulseCount  = Math.round((nonAccelDist/distUnit) * stepsPerMM);
      a.pps         = vel * stepsPerMM;
      a.ustepPulses = ustepPulses;
      if(accelDist2) {
        let ppsJerk = fullStepsMM * (jerk << ustep);
        actionArr.splice(aIdx+1, 0,
            {extra: true, pulseCount: Math.round(accelDist2 * stepsPerMM), pps: ppsJerk});
      }
      if(++aIdx >= actionArr.length) break;
    }
    return true;
  }

  let lastUstepX = null, lastUstepY = null, lastPpsX = null, lastPpsY= null;

  let emitPath = (path) => {
    // fill action array with initial values for X
    let lastDir = still, actionIdx=0, actionX = [];
    for(let pathIdx=0; pathIdx < path.length-2; pathIdx += 2) {
      let x1 = path[pathIdx], x2 = path[pathIdx+2];
      if(x1 == -1) x1 = 0;
      else x1 = (639 - x1) * scale + imageOfsX;
      x2 = (639 - x2) * scale + imageOfsX;
      let dir = ((x2 - x1) > 0 ? fwd : bwd);
      if(x1 == x2)
        actionX[actionIdx++] = {vel: 0, usecs:0};
      else if(lastDir != still && lastDir != dir)
        actionX[actionIdx++] = {pos1: x1, pos2: x2, vel: jerk, dir};
      else
        actionX[actionIdx++] = {pos1: x1, pos2: x2, vel: tgtMmSec, dir};
      lastDir = dir;
    }
    if(!planAxis(actionX)) return -1;

    // fill action array with initial values for Y
    let actionY = []; lastDir = still; actionIdx=0;
    for(let pathIdx=0; pathIdx < path.length-2; pathIdx += 2) {
      let y1 = path[pathIdx+1], y2 = path[pathIdx+3];
      if(y1 == -1) y1 = 0;
      else y1 = y1 * scale + imageOfsY;
      y2 = y2 * scale + imageOfsY;
      let dir = ((y2 - y1) > 0 ? fwd : bwd);
      if(y1 == y2)
        actionY[actionIdx++] = {vel: 0, usecs:0};
      else if(lastDir != still && lastDir != dir)
        actionY[actionIdx++] = {pos1: y1, pos2: y2, vel: jerk, dir};
      else
        actionY[actionIdx++] = {pos1: y1, pos2: y2, vel: tgtMmSec, dir};
      lastDir = dir;
    }
    if(!planAxis(actionY)) return -1;

    let pathUsecs = 0;
    let xIdx = 0, yIdx = 0;
    while(actionX[xIdx]) {
      let ax = actionX[xIdx];
      let ay = actionY[yIdx];
      let haveExtraX = (actionX[xIdx+1] && actionX[xIdx+1].extra);
      let haveExtraY = (actionY[yIdx+1] && actionY[yIdx+1].extra);

      let usecs = Math.max(ax.usecs, ay.usecs);
      pathUsecs += usecs;
      if(ax.vel == 0)
        emitDelay(X, usecs);
      else {
        // this assumes accel scales with pps, which isn't exact
        ax.pps = ax.pps * (ax.usecs/usecs);
        if(ax.ustep != lastUstepX) {
          if(lastPpsX === null) lastPpsX = ax.pps;
          emitUstep(X, ax.ustep, ax.ustepPulses, lastPpsX);
        }
        lastUstepX = ax.ustep;
        lastPpsX = ax.pps;
        emitVector(X, ax.dir, ax.pulseCount, ax.pps, ax.ustep);
        if(haveExtraX) {
          let dir = ax.dir, ustep = ax.ustep;
          ax = actionX[xIdx+1];
          emitVector(X, dir, ax.pulseCount, ax.pps, ustep);
        }
      }
      if(ay.vel == 0)
        emitDelay(Y, usecs);
      else {
        // this assumes accel scales with pps, which isn't exact
        if(ay.usecs <= usecs) ay.pps = ay.pps * (ay.usecs/usecs);
        if(ay.ustep != lastUstepY) {
          if(lastPpsY === null) lastPpsY = ay.pps;
          emitUstep(Y, ay.ustep, ay.ustepPulses, lastPpsY);
        }
        lastUstepY = ay.ustep;
        lastPpsY = ay.pps;
        emitVector(Y, ay.dir, ay.pulseCount, ay.pps, ay.ustep);
        if(haveExtraY) {
          let dir = ay.dir, ustep = ay.ustep;
          ay = actionY[yIdx+1];
          emitVector(Y, dir, ay.pulseCount, ay.pps, ustep);
        }
      }
      xIdx++; if(haveExtraX) xIdx++;
      yIdx++; if(haveExtraY) yIdx++;
    }
    return pathUsecs;
  }

  let exportDrawing = () => {
    emitAccel();
    let usecs = 0;
    usecs += emitHome();
    // -1 is special code for starting at home
    let lastX = -1, lastY = -1;
    let pathCount = paths.length;
    for(let path of paths)  {
      // console.log("pathCount", pathCount--);
      let planUsecs = emitPath([lastX, lastY, path[0], path[1]]);
      if (planUsecs == -1) break;
      usecs += planUsecs;

      usecs += emitDrop();
      planUsecs = emitPath(path);
      if (planUsecs == -1) {
        usecs += emitLift();
        break;
      }
      usecs += planUsecs;
      lastX = path[path.length-2];
      lastY = path[path.length-1];
      usecs += emitLift();
    }
    usecs += emitHome();
    console.log("exportData:", exportData);
    console.log("file size(Kb):",  Math.round(exportData.length/1024));
    console.log("printTime(mins):", Math.round(usecs / 60e6));
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
        nameText: "",
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
          lazy: false, tooltip: 'none', piecewise: false
				},
        sliderUndo: {
					value: 0, width: 255, height: 8, dotSize: 20,
          min: 0, max: 0, interval: 1, disabled: false,
          show: true, speed: 0.3, reverse: false,
          lazy: false, tooltip: 'none', piecewise: false
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
      drawPaths: function() {
        let totalVectors = 0;
        imageData_u32.fill(WHITE);
        ctx.putImageData(imageData, 0, 0);
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.lineWidth = 1;
        for(let path of paths) {
          ctx.beginPath();
          ctx.moveTo(path[0],path[1]);
          for(let i = 2; i < path.length; i += 2) {
            ctx.lineTo(path[i], path[i+1]);
            totalVectors++;
          }
          ctx.stroke();
        }
        console.log("totalVectors:", totalVectors);
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
        } else if (this.deleting) {
          this.deleting = false;
          this.saving = true;
        }
      },
      delMouseover: function(event) {
        if(this.deleting)
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
            if(lineNum && (!lineDeleted[lineNum] || lineDeleted[lineNum] > this.undoValue)) {
              for(let i=0; i < lines.length; i++)
                if(lineDeleted[i] && lineDeleted[i] > this.undoValue)
                  delete lineDeleted[i];
              // delete line
              this.deletedCount = this.undoValue;
              this.deletedCount++;
              lineDeleted[lineNum]  = this.deletedCount;
              this.sliderUndo.max   = this.deletedCount
              this.sliderUndo.value = this.deletedCount;
              setTimeout( () => { this.drawLines() }, 50);
            }
          }
        }
      },
      undoChange: function(val) {
        console.log("undo:", val);
        this.undoValue = val;
        this.drawLines();
      },

      saveClick: function(val) {
        let newLines = [];
        for(let i=0; i < lines.length; i++) {
          let line = lines[i];
          if(!line || !line.length || lineTooSmall[i] ||
             (lineDeleted[i] && lineDeleted[i] <= this.undoValue))
            continue;
          newLines[newLines.length] = line;
        }
        paths = [];
        let lenSum = 0;
        for(let j=0; j < newLines.length; j++) {
          let newLine = newLines[j], midpoints = [];
          bisectLine(midpoints, newLine, 0, newLine.length);
          let path = [newLine[0], newLine[1]];
          for(let idx of midpoints)
            path = path.concat(newLine[idx], newLine[idx+1]);
          paths[paths.length] = path.concat(newLine[newLine.length-2], newLine[newLine.length-1]);
        }
        this.drawPaths();
        console.log("paths created (count, avg len, first, last):",
                     paths.length, Math.round(lenSum/paths.length), paths[0], paths[paths.length-1]);
        exportDrawing();
      },

      // this runs when video is first frozen
      // it turns pixels into clean lines
      process: function() {
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

        // copy lines with media filter and remove duplicates
        let newLines = [];
        for(let i=0; i < lines.length; i++) {
          var line = lines[i];
          if(!line) continue;

          // median filter of x and y
          let newLine = [0,0];
          for(let j=2; j < line.length-2; j++) {
            let pix3 = [line[j-2], line[j], line[j+2]];
            pix3.sort((a,b) => a-b);
            newLine = newLine.concat(pix3[1]);
          }

          // remove duplicates
          let deDupLine = [];
          for(let j=2; j < newLine.length; j += 2) {
            if(newLine[j]   != newLine[j-2] ||
               newLine[j+1] != newLine[j+1-2])
              deDupLine = deDupLine.concat(newLine[j],newLine[j+1]);
          }
          // remove ends
          deDupLine.splice(0,2);
          deDupLine.splice(-2,2);

          // add new line
          newLines[newLines.length] = deDupLine;
        }
        lines = newLines;
        console.log("number of lines after filter:", actualLineCount());

        this.drawLines();

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
