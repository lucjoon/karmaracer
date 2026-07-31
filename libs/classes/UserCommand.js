var UserCommand = function(gameInstance, ts, clockSyncDifference) {
  this.clockSyncDifference = gameInstance.clockSync.difference;
  this.actions = {
    forward:  gameInstance.keyboardHandler.forward,
    backward: gameInstance.keyboardHandler.backward,
    left:     gameInstance.keyboardHandler.left,
    right:    gameInstance.keyboardHandler.right,
    shoot:    gameInstance.keyboardHandler.shoot
  };
  // Mouse aims; keyboard always moves at full speed (force 0.025 → multiplier 1).
  if ($('#use_mouse_for_direction').is(':checked') && gameInstance.steeringWheelController) {
    this.mousePos = {
      force: 0.025,
      angle: gameInstance.steeringWheelController.angle
    };
    this.useMouseAim = true;
  } else {
    this.mousePos = {
      force: 0.025,
      angle: gameInstance.myCar ? (gameInstance.myCar.r || 0) : 0
    };
    this.useMouseAim = false;
  }
  this.ts = ts;
  this.active = true;
};

UserCommand.prototype.isIdle = function() {
  for (var action in this.actions) {
    if (this.actions[action] === true) {
      return false;
    }
  }
  return true;
};

UserCommand.prototype.isEqual = function(userCmd) {
  if (typeof userCmd === 'undefined') {
    return false;
  }
  for (var action in this.actions) {
    if (this.actions[action] !== userCmd.actions[action]) {
      return false;
    }
  }
  if (this.mousePos.force !== userCmd.mousePos.force) {
    return false;
  }
  if (this.mousePos.angle !== userCmd.mousePos.angle) {
    return false;
  }
  return true;
};

UserCommand.prototype.execute = function(body, angleLeftRight, distance) {
  // Aim with mouse when enabled; otherwise turn with left/right keys only.
  if (this.useMouseAim) {
    body.turn(this.mousePos.angle - body.getTransientPosition().r);
  }
  if (this.actions.left === true) {
    body.turn(-angleLeftRight);
  }
  if (this.actions.right === true) {
    body.turn(angleLeftRight);
  }
  // Full-speed keyboard drive (ignore mouse-distance force scaling).
  if (this.actions.forward === true) {
    body.accelerate(distance);
  }
  if (this.actions.backward === true) {
    body.accelerate(-distance / 2);
  }
};

module.exports = UserCommand;
