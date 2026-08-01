/*global RTCPeerConnection*/
(function() {
  "use strict";

  var DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

  function WebRTCChannel(socketManager) {
    this.socketManager = socketManager;
    this.socket = null;
    this.pc = null;
    this.channel = null;
    this.open = false;
    this.handlers = {};
    this.$status = null;
  }

  WebRTCChannel.prototype.isOpen = function() {
    return this.open && this.channel && this.channel.readyState === "open";
  };

  WebRTCChannel.prototype.on = function(event, handler) {
    this.handlers[event] = handler;
  };

  WebRTCChannel.prototype.send = function(event, data) {
    if (!this.isOpen()) {
      return false;
    }
    try {
      this.channel.send(JSON.stringify({ t: event, d: data }));
      return true;
    } catch (e) {
      this.open = false;
      this.updateStatus("fallback");
      return false;
    }
  };

  WebRTCChannel.prototype.updateStatus = function(state) {
    if (!this.$status || !this.$status.length) {
      this.$status = $("#webrtc-status");
    }
    if (!this.$status.length) {
      return;
    }
    this.$status
      .text("webrtc: " + state)
      .toggleClass("webrtc-on", state === "open")
      .toggleClass("webrtc-off", state !== "open");
  };

  WebRTCChannel.prototype.bindSocket = function(socket) {
    var that = this;
    this.socket = socket;
    this.updateStatus("signaling");

    socket.on("webrtc:offer", function(offer) {
      that.handleOffer(offer);
    });

    socket.on("webrtc:ice", function(candidate) {
      if (!that.pc || !candidate) {
        return;
      }
      that.pc.addIceCandidate(candidate).catch(function() {});
    });

    socket.on("webrtc:ready", function() {
      // server-side confirmation; channel onopen is the source of truth
    });
  };

  WebRTCChannel.prototype.handleOffer = function(offer) {
    var that = this;

    this.closePeer();
    this.updateStatus("negotiating");

    this.pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });

    this.pc.onicecandidate = function(ev) {
      if (ev.candidate && that.socket) {
        that.socket.emit("webrtc:ice", ev.candidate);
      }
    };

    this.pc.onconnectionstatechange = function() {
      var state = that.pc && that.pc.connectionState;
      if (state === "failed" || state === "disconnected" || state === "closed") {
        that.open = false;
        that.updateStatus("fallback");
      }
    };

    this.pc.ondatachannel = function(ev) {
      that.attachChannel(ev.channel);
    };

    return this.pc
      .setRemoteDescription(offer)
      .then(function() {
        return that.pc.createAnswer();
      })
      .then(function(answer) {
        return that.pc.setLocalDescription(answer);
      })
      .then(function() {
        that.socket.emit("webrtc:answer", {
          type: that.pc.localDescription.type,
          sdp: that.pc.localDescription.sdp
        });
      })
      .catch(function(err) {
        console.error("WebRTC answer failed", err);
        that.updateStatus("fallback");
        that.closePeer();
      });
  };

  WebRTCChannel.prototype.attachChannel = function(channel) {
    var that = this;
    this.channel = channel;

    channel.onopen = function() {
      that.open = true;
      that.updateStatus("open");
    };

    channel.onclose = function() {
      that.open = false;
      that.updateStatus("fallback");
    };

    channel.onerror = function() {
      that.open = false;
      that.updateStatus("fallback");
    };

    channel.onmessage = function(ev) {
      that.onMessage(ev.data);
    };
  };

  WebRTCChannel.prototype.onMessage = function(raw) {
    var msg;
    try {
      msg = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(
        typeof TextDecoder !== "undefined"
          ? new TextDecoder().decode(raw)
          : String.fromCharCode.apply(null, new Uint8Array(raw))
      );
    } catch (e) {
      return;
    }
    if (!msg || !msg.t) {
      return;
    }

    if (msg.t === "objects") {
      this.socketManager.handleReceivedObjects(msg.d);
      return;
    }

    if (msg.t === "karma_pong" && msg.d) {
      var clock = this.socketManager.gameInstance.clockSync;
      msg.d.clientReceived = Date.now();
      clock.pong(msg.d);
      return;
    }

    var handler = this.handlers[msg.t];
    if (handler) {
      handler(msg.d);
    }
  };

  WebRTCChannel.prototype.closePeer = function() {
    this.open = false;
    try {
      if (this.channel) {
        this.channel.close();
      }
    } catch (e) { /* ignore */ }
    try {
      if (this.pc) {
        this.pc.close();
      }
    } catch (e) { /* ignore */ }
    this.channel = null;
    this.pc = null;
  };

  Karma.WebRTCChannel = WebRTCChannel;
})();
