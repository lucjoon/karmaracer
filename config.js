var os = require("os");
var sharedConfig = require('./config_shared');

var configSingleton = function() {
  var config = {
    host: process.env.KARMA_HOST || 'http://localhost:8080',
    port: parseInt(process.env.PORT || process.env.KARMA_PORT || '8080', 10),
    env: process.env.NODE_ENV || 'local',
    // Guest / revival mode: no Facebook required, Mongo optional
    guestMode: process.env.KARMA_GUEST_MODE !== '0',
    useMemoryDb: process.env.KARMA_MEMORY_DB === '1' ||
      process.env.NO_MONGO === '1' ||
      ((process.env.NODE_ENV || 'local') === 'local' && process.env.KARMA_MEMORY_DB !== '0'),
    appID: process.env.FB_APP_ID || '156724717828757',
    appName: process.env.FB_APP_NAME || 'karmaracer_dev',
    appSecret: process.env.FB_APP_SECRET || 'b154448258775abf1cebc39eaa8df713',
    mongoUri: process.env.MONGODB_URI || process.env.MONGOLAB_URI || "mongodb://127.0.0.1:27017/karmaracer",
    gameMaxLevel: 3,
    physicalTicksPerSecond: 30,
    positionsSocketEmitsPerSecond: 20,
    botManagerTicksPerSecond: 15,
    userCommandsSentPerSecond: 20,
    botsPerMap: 7,
    serverPath: __dirname,
    botDensity: 1 / 2300,
    noBots: process.env.NO_BOTS,
    FBScope: 'public_profile',
    physics: {
      dichotomyIterations: sharedConfig.physics.dichotomyIterations
    },
    myCarSpeed: 11,
    myCarTurnSpeed: Math.PI * 2
  };

  switch (config.env) {
    case "production":
      config.host = process.env.KARMA_HOST || 'https://karmaracer.herokuapp.com';
      config.port = process.env.PORT;
      config.appID = process.env.FB_APP_ID || '512708015460560';
      config.appSecret = process.env.FB_APP_SECRET || '208a70456e24df5d25f4e136aa83a930';
      config.appName = process.env.FB_APP_NAME || 'karmaracer';
      config.gameMaxLevel = 9;
      config.guestMode = process.env.KARMA_GUEST_MODE === '1';
      break;
  }

  console.info('fb host is', config.env, config.host);
  config.callbackURL = config.host + '/auth/facebook/callback';
  console.info('run on host', config.host, '(' + os.hostname() + ')');
  if (config.guestMode) {
    console.info('guest mode enabled (no Facebook required)');
  }

  return config;

}();

module.exports = configSingleton;
