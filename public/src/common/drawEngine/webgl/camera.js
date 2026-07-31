(function(EngineWebGL) {
  "use strict";
  
  EngineWebGL.prototype.applyCamera = function() {
    var debugLookFromAbove = false;
    
    if (!this.gameInstance || !this.gameInstance.myCar) {
      return;
    }
    
    if (debugLookFromAbove) {
      mat4.rotate(this.mvMatrix, this.mvMatrix, Math.PI / 2, [0, 0, 1]);
      mat4.rotate(this.mvMatrix, this.mvMatrix, -degToRad(180), [1, 0, 0]);
      mat4.translate(this.mvMatrix, this.mvMatrix, [-35, 5, 100]);
      return;
    } 
    
    this.updateCameraPosition();
    
    mat4.rotate(this.mvMatrix, this.mvMatrix, -degToRad(this.camera.pitch), [1, 0, 0]);    
    mat4.rotate(this.mvMatrix, this.mvMatrix, Math.PI / 2, [0, 0, 1]);      
    mat4.rotate(this.mvMatrix, this.mvMatrix, -this.camera.r, [0, 0, 1]);      
    mat4.translate(this.mvMatrix, this.mvMatrix, [-this.camera.x, -this.camera.y, -this.camera.z]);        
  };
  
  EngineWebGL.prototype.updateCameraPosition = function() {
    var myCar = this.gameInstance.myCar;
    if (!myCar || myCar.dead) {
      return;
    }

    var carPos = {
      x: myCar.x,
      y: myCar.y,
      r: myCar.r || 0
    };

    var interpData = this.interpolator.interpData;
    if (interpData.ready && interpData.snapAfter && interpData.snapBefore) {
      var carsAfter = interpData.snapAfter.cars || {};
      var carsBefore = interpData.snapBefore.cars || {};
      for (var j in carsAfter) {
        var car = carsAfter[j];
        if (!car || car.id != myCar.id) {
          continue;
        }
        if (carsBefore[j]) {
          carPos = this.interpPosOfCar(j);
        } else {
          carPos = {
            x: car.x,
            y: car.y,
            r: car.r || 0
          };
        }
        break;
      }
    }

    var distFromCamera = 2;
    this.camera.x = carPos.x - distFromCamera * Math.cos(carPos.r);
    this.camera.y = carPos.y - distFromCamera * Math.sin(carPos.r);
    this.camera.r = carPos.r;
  };

}(Karma.EngineWebGL));
