var UserController = require('./db/UserController');

function getSession(socket) {
  if (!socket.handshake.session) {
    socket.handshake.session = {};
  }
  return socket.handshake.session;
}

function ensureGuestUser(socket, playerName, callback) {
  var session = getSession(socket);
  if (session.user && session.user.fbid) {
    if (playerName && session.user.playerName !== playerName) {
      session.user.playerName = playerName;
    }
    return callback(null, session.user);
  }

  var name = playerName || 'Guest';
  if (!session.guestId) {
    session.guestId = 'guest_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  }

  UserController.createOrGet(session.guestId, name, function(err, user) {
    if (err) {
      return callback(err);
    }
    if (typeof user.money !== 'number') {
      user.money = 0;
    }
    if (!user.cars || user.cars.length === 0) {
      user.cars = ['c1'];
    }
    if (!user.currentCar) {
      user.currentCar = 'c1';
    }
    session.user = user;
    callback(null, user);
  });
}

module.exports = {
  ensureGuestUser: ensureGuestUser,
  getSession: getSession
};
