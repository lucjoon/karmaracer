var MongoClient = require('mongodb').MongoClient;
var KLib = require('./../classes/KLib');
var config = require('../../config');

function matchesCriteria(item, criteria) {
  if (!criteria || Object.keys(criteria).length === 0) {
    return true;
  }
  for (var key in criteria) {
    if (criteria.hasOwnProperty(key) && item[key] !== criteria[key]) {
      return false;
    }
  }
  return true;
}

function MemoryCursor(data, criteria) {
  this._data = data;
  this._criteria = criteria || {};
  this._sort = null;
  this._limit = null;
}

MemoryCursor.prototype.sort = function(sortSpec) {
  this._sort = sortSpec;
  return this;
};

MemoryCursor.prototype.limit = function(n) {
  this._limit = n;
  return this;
};

MemoryCursor.prototype.toArray = function(callback) {
  var results = this._data.filter(function(item) {
    return matchesCriteria(item, this._criteria);
  }.bind(this));

  if (this._sort) {
    var sortKey = Object.keys(this._sort)[0];
    var direction = this._sort[sortKey];
    results.sort(function(a, b) {
      if (a[sortKey] < b[sortKey]) {
        return direction < 0 ? 1 : -1;
      }
      if (a[sortKey] > b[sortKey]) {
        return direction < 0 ? -1 : 1;
      }
      return 0;
    });
  }

  if (this._limit != null) {
    results = results.slice(0, this._limit);
  }

  process.nextTick(function() {
    callback(null, results);
  });
};

function MemoryCollection(name, store) {
  this.name = name;
  if (!store[name]) {
    store[name] = [];
  }
  this.data = store[name];
}

MemoryCollection.prototype.find = function(criteria) {
  return new MemoryCursor(this.data, criteria || {});
};

MemoryCollection.prototype.insert = function(doc, callback) {
  var item = JSON.parse(JSON.stringify(doc));
  item._id = item._id || ('mem_' + Date.now() + '_' + Math.floor(Math.random() * 1e6));
  this.data.push(item);
  process.nextTick(function() {
    callback(null, [item]);
  });
};

MemoryCollection.prototype.update = function(criteria, update, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  var found = null;
  for (var i = 0; i < this.data.length; i++) {
    if (matchesCriteria(this.data[i], criteria)) {
      found = this.data[i];
      break;
    }
  }

  if (found) {
    var set = (update && update.$set) ? update.$set : update;
    for (var key in set) {
      if (set.hasOwnProperty(key) && key !== '_id') {
        found[key] = set[key];
      }
    }
  } else if (options.upsert) {
    var created = {};
    for (var c in criteria) {
      if (criteria.hasOwnProperty(c)) {
        created[c] = criteria[c];
      }
    }
    var values = (update && update.$set) ? update.$set : (update || {});
    for (var v in values) {
      if (values.hasOwnProperty(v) && v !== '_id') {
        created[v] = values[v];
      }
    }
    created._id = 'mem_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    this.data.push(created);
  }

  process.nextTick(function() {
    if (KLib.isFunction(callback)) {
      callback(null);
    }
  });
};

module.exports = function() {
  var that = {};
  var memoryStore = {};

  var useMemory = function() {
    that.memory = true;
    that.db = {
      collection: function(name, callback) {
        process.nextTick(function() {
          callback(null, new MemoryCollection(name, memoryStore));
        });
      }
    };
    console.info('USING IN-MEMORY DB (Mongo optional / unavailable)');
  };

  var getCollection = function(name, callback) {
    if (config.performanceTest) {
      return callback();
    }
    that.db.collection(name, function(err, collection) {
      if (err) {
        console.error('ERROR connecting to DB collection', err);
        return callback(err);
      }
      return callback(null, collection);
    });
  };

  var connect = function(callback) {
    if (config.useMemoryDb) {
      useMemory();
      return callback(null, that.db);
    }

    MongoClient.connect(config.mongoUri, function(err, db) {
      if (err) {
        console.warn('Mongo unavailable, falling back to memory DB:', err.message);
        config.useMemoryDb = true;
        useMemory();
        return callback(null, that.db);
      }
      console.log('CONNECTED TO MONGO');
      that.db = db;
      that.memory = false;
      callback(null, db);
    });
  };

  var saveItem = function(collection, criteria, item, callback) {
    if (item && item !== null) {
      var s = JSON.stringify(item);
      if (s === null) {
        return;
      }
      var updateItem = JSON.parse(s);
      if (updateItem === null) {
        return;
      }

      delete updateItem._id;
      collection.update(criteria, {
        $set: updateItem
      }, {
        upsert: true
      }, function(err) {
        if (err) {
          console.warn('err save item', err.message);
          if (KLib.isFunction(callback)) {
            return callback(err);
          }
        } else {
          if (KLib.isFunction(callback)) {
            return callback(null, item);
          }
        }
      });
    }
  };

  var getOne = function(collection, criteria, callback) {
    collection.find(criteria).toArray(function(err, results) {
      if (err) {
        return callback(err);
      }
      if (results.length === 1) {
        return callback(null, results[0]);
      } else {
        return callback('itemNotFound');
      }
    });
  };

  var insert = function(collection, initValue, callback) {
    collection.insert(initValue, function(err, results) {
      if (err) {
        return callback(err);
      }
      return callback(null, results[0]);
    });
  };

  var createOrGetItem = function(collection, criteria, initValue, callback) {
    getOne(collection, criteria, function(err, item) {
      if (err === 'itemNotFound') {
        return insert(collection, initValue, callback);
      }
      if (err) {
        return callback(err);
      }
      return callback(null, item);
    });
  };

  return {
    connect: connect,
    getCollection: getCollection,
    saveItem: saveItem,
    createOrGetItem: createOrGetItem,
    getOne: getOne
  };

}();
