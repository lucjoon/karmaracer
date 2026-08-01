(function() {
  "use strict";

  Karma.getDrawEngine = function(isMinimap, canvasId, drawEngineType, items, worldInfo, gScale, gameInstance, connection, callback) {
    var engine;
    drawEngineType = drawEngineType || 'CANVAS';
    var canvas = document.getElementById(canvasId);

    function startCanvas() {
      engine = new Karma.Engine2DCanvas(isMinimap, canvas, canvasId, items, worldInfo, gScale, gameInstance, connection);
      engine.init(function(err) {
        if (err) {
          console.log('Draw engine failed to initialize', isMinimap);
          callback(err);
        } else {
          callback(null, engine);
        }
      });
    }

    if (drawEngineType === 'WEBGL') {
      try {
        engine = new Karma.EngineWebGL(gameInstance, canvas, canvasId, worldInfo);
        if (!engine.gl) {
          console.warn('WebGL unavailable, falling back to Canvas 2D');
          return startCanvas();
        }
        engine.init(function(err) {
          if (err) {
            console.warn('WebGL init failed, falling back to Canvas 2D', err);
            return startCanvas();
          }
          callback(null, engine);
        });
      } catch (e) {
        console.warn('WebGL crashed, falling back to Canvas 2D', e);
        return startCanvas();
      }
      return;
    }

    if (drawEngineType === 'CANVAS') {
      return startCanvas();
    }

    callback('draw engine not found', null);
  };

}());
