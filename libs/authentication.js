var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var session = require('express-session');
var KLib = require('./classes/KLib');
var CONFIG = require('./../config');

var sessionStore = new session.MemoryStore();
var sessionSecret = CONFIG.sessionSecret;
var sessionName = 'session.sid';

var sessionOptions = {
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  name: sessionName,
  secret: sessionSecret,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
};

function attachSessionFromCookie(socket, next) {
  var rawCookie = socket.request.headers.cookie;
  if (!rawCookie) {
    if (CONFIG.guestMode) {
      socket.handshake.session = {};
      return next();
    }
    return next(new Error('No cookie transmitted.'));
  }

  var parsed = cookie.parse(rawCookie);
  var sid = cookieParser.signedCookie(parsed[sessionName], sessionSecret);
  if (!sid) {
    socket.handshake.session = {};
    return next();
  }

  sessionStore.get(sid, function(err, sess) {
    if (!err && sess) {
      socket.handshake.session = sess;
      socket.request.session = sess;
    } else {
      socket.handshake.session = {};
    }
    next();
  });
}

var setup = function(app, io, renderMethod) {
  io.use(attachSessionFromCookie);

  if (CONFIG.facebookEnabled) {
    passport.use(new FacebookStrategy({
      clientID: CONFIG.appID,
      clientSecret: CONFIG.appSecret,
      callbackURL: CONFIG.callbackURL,
      profileFields: ['id', 'displayName', 'emails']
    }, function(accessToken, refreshToken, profile, done) {
      profile.accessToken = accessToken;
      return done(null, profile);
    }));
  }

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  function parse_signed_request(signed_request) {
    var list = signed_request.split('.');
    var payload = list[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  }

  function authFB(req) {
    if (!req.body || !req.body.signed_request) {
      return;
    }
    var fbReq = parse_signed_request(req.body.signed_request);
    req.session.fbid = fbReq.user_id;
    req.session.accessToken = fbReq.oauth_token;
    if (fbReq.user && fbReq.user.locale) {
      req.session.locale = fbReq.user.locale;
    }
  }

  app.post('/game.:map', function(req, res) {
    authFB(req);
    if (KLib.isUndefined(req.session.accessToken)) {
      var FBcallbackURL = encodeURIComponent('https://apps.facebook.com/' + CONFIG.appName + 'game.' + req.params.map);
      renderMethod(req, res, 'auth', 'CANVAS', {
        FB_KARMA_ID: CONFIG.appID,
        redirect_uri: FBcallbackURL,
        scope: CONFIG.FBScope
      });
    } else {
      renderMethod(req, res, 'game', 'CANVAS');
    }
  });

  app.post('/', function(req, res) {
    authFB(req);
    if (KLib.isUndefined(req.session.accessToken)) {
      var FBcallbackURL = encodeURIComponent('https://apps.facebook.com/' + CONFIG.appName);
      renderMethod(req, res, 'auth', 'CANVAS', {
        FB_KARMA_ID: CONFIG.appID,
        redirect_uri: FBcallbackURL,
        scope: CONFIG.FBScope
      });
    } else if (CONFIG.facebookEnabled) {
      res.redirect('/auth/facebook');
    } else {
      res.redirect('/');
    }
  });

  app.get('/login', function(req, res) {
    req.session.beforeLoginURL = req.headers.referer;
    renderMethod(req, res, 'login', 'CANVAS');
  });

  app.get('/logout', function(req, res, next) {
    req.logout(function() {
      delete req.session.fbid;
      delete req.session.user;
      delete req.session.accessToken;
      delete req.session.locale;
      res.redirect('/');
    });
  });

  var setupFBUser = function(req, res) {
    try {
      function getPath(url) {
        if (!KLib.isUndefined(url)) {
          var list = url.split('/');
          return list[list.length - 1];
        }
        return null;
      }
      var path = getPath(req.headers.referer);
      var route = '/' + path;
      if (path === 'login') {
        var bPath = getPath(req.session.beforeLoginURL);
        route = bPath === null ? '/' : '/' + bPath;
      }
      if (route.indexOf('/oauth') === 0) {
        route = '/';
      }
      if (!KLib.isUndefined(req.session.initialURL)) {
        route = req.session.initialURL;
      }
      var fbid = req.session.passport.user.id;
      req.session.accessToken = req.session.passport.user.accessToken;
      if (req.session.passport.user._json && req.session.passport.user._json.locale) {
        req.session.locale = req.session.passport.user._json.locale;
      }

      var displayName = req.session.passport.user.displayName;
      var UserController = require('./db/UserController');
      UserController.createOrGet(fbid, displayName, function(err, user) {
        req.session.user = user;
        res.redirect(route);
      });
    } catch (error) {
      console.error('setupFBUser error', error);
      res.redirect('/');
    }
  };

  if (CONFIG.facebookEnabled) {
    app.get('/auth/facebook', passport.authenticate('facebook', {
      scope: CONFIG.FBScope
    }));

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      failureRedirect: '/login'
    }), setupFBUser);
  } else {
    app.get('/auth/facebook', function(req, res) {
      res.status(503).send('Facebook auth is not configured.');
    });
  }
};

var reloadUserFromDbIfAuthenticated = function(req, res, next) {
  var UserController = require('./db/UserController');
  if (req.session.user) {
    UserController.createOrGet(req.session.user.fbid, req.session.user.playerName, function(err, user) {
      req.session.user = user;
      return next();
    });
  } else {
    return next();
  }
};

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

module.exports = {
  setup: setup,
  ensureAuthenticated: ensureAuthenticated,
  sessionOptions: sessionOptions,
  reloadUserFromDbIfAuthenticated: reloadUserFromDbIfAuthenticated
};
