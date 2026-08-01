/**
 * Authoritative client↔server WebRTC DataChannel for high-frequency game traffic.
 * Signaling stays on Socket.io. Falls back to Socket.io if the channel is not open.
 */
var CONFIG = require('./../config');

var RTCPeerConnection;
try {
  RTCPeerConnection = require('werift').RTCPeerConnection;
} catch (e) {
  console.warn('werift not available — WebRTC disabled:', e.message);
}

function iceServersFromConfig() {
  var servers = CONFIG.webrtcIceServers || [];
  return servers.map(function(url) {
    return typeof url === 'string' ? { urls: url } : url;
  });
}

function toPlainDescription(desc) {
  if (!desc) {
    return null;
  }
  return {
    type: desc.type,
    sdp: desc.sdp
  };
}

function toPlainCandidate(candidate) {
  if (!candidate) {
    return null;
  }
  if (typeof candidate.toJSON === 'function') {
    return candidate.toJSON();
  }
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment
  };
}

function parsePayload(raw) {
  if (Buffer.isBuffer(raw)) {
    raw = raw.toString('utf8');
  } else if (typeof raw !== 'string') {
    raw = String(raw);
  }
  return JSON.parse(raw);
}

function handleChannelMessage(client, raw) {
  var msg;
  try {
    msg = parsePayload(raw);
  } catch (e) {
    return;
  }
  if (!msg || !msg.t) {
    return;
  }

  if (msg.t === 'user_command') {
    try {
      client.userCommandManager.receivedUserCmd(msg.d);
    } catch (e) {
      console.error(e.stack || e);
    }
    return;
  }

  if (msg.t === 'karma_ping' && msg.d) {
    var data = msg.d;
    data.serverReceived = Date.now();
    data.serverSent = Date.now();
    emitOnChannel(client, 'karma_pong', data);
  }
}

function emitOnChannel(client, event, data) {
  var rtc = client._rtc;
  if (!rtc || !rtc.open || !rtc.channel || rtc.channel.readyState !== 'open') {
    return false;
  }
  try {
    rtc.channel.send(JSON.stringify({ t: event, d: data }));
    return true;
  } catch (e) {
    rtc.open = false;
    return false;
  }
}

function attachEmitRealtime(client) {
  if (client.emitRealtime) {
    return;
  }
  client.emitRealtime = function(event, data) {
    if (emitOnChannel(client, event, data)) {
      return;
    }
    client.emit(event, data);
  };
}

function closePeer(client) {
  var rtc = client._rtc;
  if (!rtc) {
    return;
  }
  rtc.open = false;
  try {
    if (rtc.channel) {
      rtc.channel.close();
    }
  } catch (e) { /* ignore */ }
  try {
    if (rtc.pc) {
      rtc.pc.close();
    }
  } catch (e) { /* ignore */ }
  client._rtc = null;
}

/**
 * Start WebRTC negotiation for a connected game client (server creates the offer).
 */
function startForClient(client) {
  if (!CONFIG.webrtcEnabled || !RTCPeerConnection) {
    attachEmitRealtime(client);
    return Promise.resolve(false);
  }

  attachEmitRealtime(client);

  if (client._rtc) {
    if (client._rtc.open) {
      return Promise.resolve(true);
    }
    if (Date.now() - client._rtc.startedAt < 8000) {
      return Promise.resolve(false);
    }
    closePeer(client);
  }

  var pc = new RTCPeerConnection({
    iceServers: iceServersFromConfig()
  });

  var rtc = {
    pc: pc,
    channel: null,
    open: false,
    startedAt: Date.now()
  };
  client._rtc = rtc;

  var channel = pc.createDataChannel('karma', {
    ordered: false,
    maxRetransmits: 0
  });
  rtc.channel = channel;

  channel.onopen = function() {
    rtc.open = true;
    client.emit('webrtc:ready');
    console.info('WebRTC open:', client.id);
  };
  channel.onclose = function() {
    rtc.open = false;
  };
  channel.onerror = function(err) {
    console.error('WebRTC channel error', client.id, err && err.error ? err.error : err);
  };
  channel.onmessage = function(ev) {
    handleChannelMessage(client, ev.data);
  };

  pc.onicecandidate = function(ev) {
    if (ev.candidate) {
      client.emit('webrtc:ice', toPlainCandidate(ev.candidate));
    }
  };

  pc.onconnectionstatechange = function() {
    var state = pc.connectionState;
    if (state === 'failed' || state === 'closed' || state === 'disconnected') {
      rtc.open = false;
    }
  };

  if (!client._webrtcHandlersBound) {
    client._webrtcHandlersBound = true;

    client.on('webrtc:answer', function(answer) {
      if (!client._rtc || !client._rtc.pc || !answer) {
        return;
      }
      client._rtc.pc.setRemoteDescription(answer).catch(function(err) {
        console.error('WebRTC setRemoteDescription(answer) failed', err);
      });
    });

    client.on('webrtc:ice', function(candidate) {
      if (!client._rtc || !client._rtc.pc || !candidate) {
        return;
      }
      client._rtc.pc.addIceCandidate(candidate).catch(function() {});
    });
  }

  return pc
    .createOffer()
    .then(function(offer) {
      return pc.setLocalDescription(offer);
    })
    .then(function() {
      client.emit('webrtc:offer', toPlainDescription(pc.localDescription));
      return true;
    })
    .catch(function(err) {
      console.error('WebRTC offer failed', err);
      closePeer(client);
      attachEmitRealtime(client);
      return false;
    });
}

module.exports = {
  startForClient: startForClient,
  closePeer: closePeer,
  attachEmitRealtime: attachEmitRealtime,
  emitOnChannel: emitOnChannel
};
