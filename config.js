var os = require('os');
var sharedConfig = require('./config_shared');

function boolEnv(name, defaultValue) {
  var v = process.env[name];
  if (v === undefined || v === '') {
    return defaultValue;
  }
  return v === '1' || v === 'true';
}

var env = process.env.NODE_ENV || 'local';
var isProd = env === 'production';

var config = {
  host: process.env.KARMA_HOST || (isProd ? '' : 'http://localhost:8080'),
  port: parseInt(process.env.PORT || process.env.KARMA_PORT || '8080', 10),
  env: env,
  guestMode: boolEnv('KARMA_GUEST_MODE', !isProd),
  useMemoryDb:
    boolEnv('KARMA_MEMORY_DB', !isProd && !process.env.MONGODB_URI) ||
    boolEnv('NO_MONGO', false),
  appID: process.env.FB_APP_ID || '',
  appName: process.env.FB_APP_NAME || 'karmaracer',
  appSecret: process.env.FB_APP_SECRET || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-me',
  mongoUri:
    process.env.MONGODB_URI ||
    process.env.MONGOLAB_URI ||
    'mongodb://127.0.0.1:27017/karmaracer',
  gameMaxLevel: parseInt(process.env.KARMA_MAX_LEVEL || (isProd ? '9' : '3'), 10),
  physicalTicksPerSecond: sharedConfig.physicalTicksPerSecond,
  positionsSocketEmitsPerSecond: sharedConfig.positionsSocketEmitsPerSecond,
  botManagerTicksPerSecond: 15,
  userCommandsSentPerSecond: sharedConfig.userCommandsSentPerSecond,
  botsPerMap: 7,
  serverPath: __dirname,
  botDensity: 1 / 2300,
  noBots: process.env.NO_BOTS,
  FBScope: 'public_profile',
  physics: {
    dichotomyIterations: sharedConfig.physics.dichotomyIterations
  },
  myCarSpeed: sharedConfig.myCarSpeed,
  myCarTurnSpeed: sharedConfig.myCarTurnSpeed,
  facebookEnabled: !!(process.env.FB_APP_ID && process.env.FB_APP_SECRET),
  // WebRTC DataChannel for objects + user_command (Socket.io remains signaling + fallback)
  webrtcEnabled: boolEnv('KARMA_WEBRTC', true),
  webrtcIceServers: (
    process.env.KARMA_WEBRTC_ICE ||
    'stun:stun.l.google.com:19302'
  )
    .split(',')
    .map(function(s) {
      return s.trim();
    })
    .filter(Boolean)
};

if (config.webrtcEnabled) {
  console.info('WebRTC realtime channel enabled (disable with KARMA_WEBRTC=0)');
}

if (!config.host && isProd) {
  config.host = process.env.KARMA_HOST || '';
}

config.callbackURL = (config.host || '') + '/auth/facebook/callback';

console.info('env', config.env, 'host', config.host || '(set KARMA_HOST)', '(' + os.hostname() + ')');
if (config.guestMode) {
  console.info('guest mode enabled (no Facebook required)');
}
if (!config.facebookEnabled) {
  console.info('Facebook auth disabled (set FB_APP_ID + FB_APP_SECRET to enable)');
}

module.exports = config;
