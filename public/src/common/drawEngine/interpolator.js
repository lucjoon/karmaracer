(function() {
  "use strict";
  
  function Interpolator(gameInstance) {
    this.gameInstance = gameInstance;
    this.interpData = {
      ready: false
    };
    return this;
  }

  Interpolator.prototype.interpPos = function(beforePos, afterPos, interpPercent) {
    if (!afterPos && !beforePos) {
      return { x: 0, y: 0, r: 0 };
    }
    if (!beforePos) {
      return {
        x: afterPos.x,
        y: afterPos.y,
        r: afterPos.r || 0
      };
    }
    if (!afterPos) {
      return {
        x: beforePos.x,
        y: beforePos.y,
        r: beforePos.r || 0
      };
    }
    if (interpPercent > 1 || !$('#interpolate').is(':checked')) {
      // we can't interpolate out of bounds !
      return {
        x: afterPos.x,
        y: afterPos.y,
        r: afterPos.r || 0
      };
    }
    var beforeR = beforePos.r || 0;
    var afterR = afterPos.r || 0;
    if (Math.abs(afterR - beforeR) > Math.PI) {
      // angle goes from 0 to 360 or from 360 to 0
        if (beforeR > Math.PI) {
          beforeR -= 2 * Math.PI;
        } else {
          beforeR += 2 * Math.PI;
        }
    }
    return {
      x: beforePos.x + (afterPos.x - beforePos.x) * interpPercent,
      y: beforePos.y + (afterPos.y - beforePos.y) * interpPercent,
      r: (beforeR + (afterR - beforeR) * interpPercent) % (2 * Math.PI)
    };
  };

  Interpolator.prototype.getInterpData = function() {
    var interpolation = 100;
    if (!this.gameInstance) {
      return;
    }
    var snapshots = this.gameInstance.snapshots;
    var stepNumbers = Object.keys(snapshots);
    var now = Date.now();
    var numSnaps = stepNumbers.length;
    var serverTs = this.gameInstance.clockSync.getServerTsForClientTs(Date.now());
    if (serverTs === null) {
      // clock not started yet, cannot interpolate
      return;
    }
    var wantedServerTs = serverTs - interpolation;
    var found = false;
    // find the two snapshots we fall between
    for (var i = numSnaps - 2; i >= 0; --i) {
      if (snapshots[stepNumbers[i    ]].stepTs <= wantedServerTs &&
          snapshots[stepNumbers[i + 1]].stepTs >= wantedServerTs) {
            found = true;
            var snapBefore = snapshots[stepNumbers[i]];
            var snapAfter =  snapshots[stepNumbers[i + 1]];
            for (var j = 0; j < i; ++j) {
              // free memory
              // delete old snapshots
              delete snapshots[stepNumbers[j]];
            }
            this.interpData.snapBefore = snapBefore;
            this.interpData.snapAfter = snapAfter;
            break;
      }
    }
    if (!found) {
      // no data available
      // don't touch this.interpData.snapBefore and this.interpData.snapAfter
    }
        
    this.interpData.ready = typeof this.interpData.snapBefore !== 'undefined' &&
      typeof this.interpData.snapAfter !== 'undefined';
    if (this.interpData.ready) {
      var snapshotsInterval = this.interpData.snapAfter.stepTs - this.interpData.snapBefore.stepTs;
      this.interpData.interpPercent = (wantedServerTs - this.interpData.snapBefore.stepTs) / snapshotsInterval;
    }
    if (!$('#interpolate').is(':checked') && numSnaps >= 2) {
      this.interpData.snapAfter = snapshots[stepNumbers[numSnaps - 1]];
    }
  };
  
  Karma.Interpolator = Interpolator;
  
}());