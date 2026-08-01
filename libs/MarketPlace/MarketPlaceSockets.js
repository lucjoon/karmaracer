var KLib = require('./../classes/KLib');
var UserController = require('./../db/UserController');
var CarController = require('./../db/CarController');
var guestUser = require('./../guestUser');

module.exports = function(client) {
  client.on('useCar', function(info, callback) {
    guestUser.ensureGuestUser(client, null, function(err, user) {
      if (err || !user) {
        return callback(err || 'not authenticated');
      }
      if (!user.cars || user.cars.indexOf(info.carName) === -1) {
        return callback('carNotOwned');
      }
      user.currentCar = info.carName;
      client.handshake.session.user = user;
      UserController.save(user, function(saveErr) {
        return callback(saveErr || null, user);
      });
    });
  });

  client.on('buyCar', function(info, callback) {
    guestUser.ensureGuestUser(client, null, function(err, user) {
      if (err || !user) {
        return callback(err || 'not authenticated');
      }
      CarController.createOrGet(info.carName, {}, function(carErr, car) {
        if (carErr || !car) {
          return callback(carErr || 'carNotFound');
        }
        if (user.cars && user.cars.indexOf(car.name) !== -1) {
          return callback(null, user);
        }
        if (user.money >= car.price) {
          user.money -= car.price;
          if (!user.cars) {
            user.cars = ['c1'];
          }
          user.cars.push(car.name);
          client.handshake.session.user = user;
          client.emit('moneyUpdated', user);
          UserController.save(user, function(saveErr) {
            return callback(saveErr || null, user);
          });
        } else {
          return callback('notEnoughMoney');
        }
      });
    });
  });
};
