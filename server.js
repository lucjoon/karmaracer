var express = require('express');
var http = require('http');
var os = require('os');
var path = require('path');
var passport = require('passport');
var session = require('express-session');
var { Server } = require('socket.io');

var auth = require('./libs/authentication');
var config = require('./config');
var KLib = require('./libs/classes/KLib');
var MapManager = require('./libs/MapManager');
var DBManager = require('./libs/db/DBManager');

var app = express();
var server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', config.env === 'production');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session(auth.sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

var supportedLanguages = ['fr', 'en'];

function index(req, res, view, draw_engine, opts) {
  var options = {
    title: 'Karma Racer',
    default_draw_engine: draw_engine,
    locale: req.session.locale,
    playerName: null,
    fbid: null
  };

  if (req.session.user) {
    options.playerName = req.session.user.playerName;
    options.fbid = req.session.user.fbid;
  }
  if (KLib.isUndefined(options.locale)) {
    options.locale = 'en_GB';
  }

  options.locale = String(options.locale).substring(0, 2);
  if (supportedLanguages.indexOf(options.locale) === -1) {
    options.locale = 'en';
  }

  if (!KLib.isUndefined(opts)) {
    for (var o in opts) {
      options[o] = opts[o];
    }
  }

  var map = req.params.map;
  if (!KLib.isUndefined(map)) {
    options.map = map;
  }

  res.render(view, options);
}

auth.setup(app, io, index);
app.io = io;

app.get('/', auth.reloadUserFromDbIfAuthenticated, function(req, res) {
  index(req, res, 'index', 'CANVAS');
});

app.get('/game.:map', auth.reloadUserFromDbIfAuthenticated, function(req, res) {
  index(req, res, 'game', req.query.draw || 'CANVAS');
});

app.get('/mm.:map', auth.reloadUserFromDbIfAuthenticated, function(req, res) {
  index(req, res, 'mapmaker', 'CANVAS');
});

app.get('/marketplace', auth.reloadUserFromDbIfAuthenticated, function(req, res) {
  index(req, res, 'marketplace', 'CANVAS');
});

app.get('/privacy', function(req, res) {
  index(req, res, 'privacy', 'CANVAS');
});

app.get('/tos', function(req, res) {
  index(req, res, 'tos', 'CANVAS');
});

app.get('/webgl', function(req, res) {
  res.render('test-client');
});

app.get('/health', function(req, res) {
  res.json({ ok: true, env: config.env });
});

DBManager.connect(function(err) {
  if (err) {
    console.error('db manager connection failed', err);
    process.exit(1);
  }

  var mapManager = new MapManager(app);
  mapManager.init(function(initErr) {
    if (initErr) {
      console.error('Error while initializing map manager', initErr);
    } else {
      console.info('map manager initialized');
    }
  });

  app.get('/status', function(req, res) {
    res.render('status', {
      numServers: Object.keys(mapManager.gameServers).length,
      numBots: mapManager.getNumBots(),
      loadAvg: os.loadavg()
    });
  });

  server.listen(config.port, function() {
    console.info('Karma Racer listening on port', config.port, '—', config.host || '');
  });
});

server.on('error', function(e) {
  console.error('Critical Server Error:', e);
  process.exit(1);
});

module.exports = app;
