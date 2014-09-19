module.exports = function(R) {
    var url = require("url");
    var _ = require("lodash");
    var assert = require("assert");
    var Promise = require("bluebird");
    var request = require("request");
    var co = require("co");

    /**
     * The Uplink micro-protocol is a simple set of conventions to implement real-time reactive Flux over the wire.
     * The frontend and the backend server share 2 means of communications :
     * - a WebSocket-like (socket.io wrapper) duplex connection to handshake and subscribe to keys/listen to events
     * - regulars HTTP requests (front -> back) to actually get data from the stores
     *
     * PROTOCOL:
     *
     * Connection/reconnection:
     *
     * Client: bind socket
     * Server: Acknowledge connection
     * Client: send "handshake" { guid: guid }
     * Server: send "handshake-ack" { recovered: bool } (recover previous session if existing based upon guid; recovered is true iff previous session existed)
     *
     * Stores:
     * Client: send "subscribeTo" { key: key }
     * Server: send "update" { key: key }
     * Client: XHR GET /uplink/key
     *
     * Events:
     * Client: send "listenTo" { eventName: eventName }
     * Server: send "event" { eventName: eventName, params: params }
     *
     * Actions:
     * Client: XHR POST /uplink/action { params: params }
     *
     * Other notifications:
     * Server: send "debug": { debug: debug } Debug-level message
     * Server: send "log" { log: log } Log-level message
     * Server: send "warn": { warn: warn } Warn-level message
     * Server: send "err": { err: err } Error-level message
     */

    var Uplink = function Uplink(httpEndpoint, socketEndpoint, guid) {
        this._httpEndpoint = httpEndpoint;
        this._socketEndPoint = socketEndpoint;
        this._guid = guid;
        if(R.isClient()) {
            this._initInClient();
        }
        if(R.isServer()) {
            this._initInServer();
        }
        this.fetch = R.scope(this.fetch, this);
        this.subscribeTo = R.scope(this.subscribeTo, this);
        this.unsubscribeFrom = R.scope(this.unsubscribeFrom, this);
        this.listenTo = R.scope(this.listenTo, this);
        this.unlistenFrom = R.scope(this.unlistenFrom, this);
        this.dispatch = R.scope(this.dispatch, this);
    };

    _.extend(Uplink.prototype, /** @lends R.Uplink.prototype */ {
        _httpEndpoint: null,
        _socketEndPoint: null,
        _subscriptions: null,
        _listeners: null,
        _socket: null,
        _guid: null,
        _promiseForHandshake: null,
        _acknowledgeHandshake: null,
        _debugLog: function _debugLog() {
            var args = arguments;
            R.Debug.dev(function() {
                console.log.apply(console, args);
            });
        },
        _emit: function _emit(name, params) {
            R.Debug.dev(R.scope(function() {
                assert(this._socket && null !== this._socket, "R.Uplink.emit(...): no active socket ('" + name + "', '" + params + "')");
            }, this));
            this._socket.emit(name, params);
        },
        _initInClient: function _initInClient() {
            R.Debug.dev(function() {
                assert(R.isClient(), "R.Uplink._initInClient(...): should only be called in the client.");
            });
            if(this._socketEndPoint) {
                var io;
                if(window.io && _.isFunction(window.io)) {
                    io = window.io;
                }
                else {
                    io = require("socket.io-client");
                }
                this._subscriptions = {};
                this._listeners = {};
                var socket = this._socket = io(this._socketEndPoint);
                socket.on("update", R.scope(this._handleUpdate, this));
                socket.on("event", R.scope(this._handleEvent, this));
                socket.on("disconnect", R.scope(this._handleDisconnect, this));
                socket.on("connect", R.scope(this._handleConnect, this));
                socket.on("handshake-ack", R.scope(this._handleHandshakeAck, this));
                socket.on("debug", R.scope(this._handleDebug, this));
                socket.on("log", R.scope(this._handleLog, this));
                socket.on("warn", R.scope(this._handleWarn, this));
                socket.on("err", R.scope(this._handleError, this));
                this._promiseForHandshake = new Promise(R.scope(function(resolve, reject) {
                    this._acknowledgeHandshake = resolve;
                }, this));
                if(window.onbeforeunload) {
                    var prevHandler = window.onbeforeunload;
                    window.onbeforeunload = R.scope(this._handleUnload(prevHandler), this);
                }
                else {
                    window.onbeforeunload = R.scope(this._handleUnload(null), this);
                }
            }
        },
        _initInServer: function _initInClient() {
            R.Debug.dev(function() {
                assert(R.isServer(), "R.Uplink._initInServer(...): should only be called in the server.");
            });
        },
        _handleUpdate: function _handleUpdate(params) {
            this._debugLog("update", params);
            var key = params.key;
            if(_.has(this._subscriptions, key)) {
                _.each(this._subscriptions[key], function(fn) {
                    fn();
                });
            }
        },
        _handleEvent: function _handleEvent(params) {
            this._debugLog("event", params);
            var eventName = params.eventName;
            var eventParams = params.params;
            if(_.has(this._listeners, eventName)) {
                _.each(this._listeners[eventName], function(fn) {
                    fn(eventParams);
                });
            }
        },
        _handleDisconnect: function _handleDisconnect(params) {
            this._debugLog("disconnect", params);
            this._promiseForHandshake = new Promise(R.scope(function(resolve, reject) {
                this._acknowledgeHandshake = resolve;
            }, this));
        },
        _handleConnect: function _handleConnect() {
            this._debugLog("connect");
            this._emit("handshake", { guid: this._guid });
        },
        _handleHandshakeAck: function _handleHandshakeAck(params) {
            this._debugLog("handshake-ack", params);
            this._acknowledgeHandshake(params);
        },
        _handleDebug: function _handleDebug(params) {
            this._debugLog("debug", params);
            R.Debug.dev(function() {
                console.warn("R.Uplink.debug(...):", params.debug);
            });
        },
        _handleLog: function _handleLog(params) {
            this._debugLog("log", params);
            console.log("R.Uplink.log(...):", params.log);
        },
        _handleWarn: function _handleWarn(params) {
            this._debugLog("warn", params);
            console.warn("R.Uplink.warn(...):", params.warn);
        },
        _handleError: function _handleError(params) {
            this._debugLog("error", params);
            console.error("R.Uplink.err(...):", params.err);
        },
        _handleUnload: function _handleUnload(prevHandler) {
            return R.scope(function() {
                if(prevHandler) {
                    prevHandler();
                }
                this._emit("unhandshake");
            }, this);
        },
        _destroyInClient: function _destroyInClient() {
            if(this._socket) {
                this._socket.close();
            }
        },
        _destroyInServer: function _destroyInServer() {
            return void 0;
        },
        _subscribeTo: function _subscribeTo(key) {
            co(function*() {
                yield this._promiseForHandshake;
                this._emit("subscribeTo", { key: key });
            }).call(this, R.Debug.rethrow("R.Uplink._subscribeTo(...): couldn't subscribe (" + key + ")"));
        },
        _unsubscribeFrom: function _unsubscribeFrom(key) {
            co(function*() {
                yield this._promiseForHandshake;
                this._emit("unsubscribeFrom", { key: key });
            }).call(this, R.Debug.rethrow("R.Uplink._subscribeTo(...): couldn't unsubscribe (" + key + ")"));
        },
        subscribeTo: function subscribeTo(key, fn) {
            var subscription = new R.Uplink.Subscription(key);
            if(!_.has(this._subscriptions, key)) {
                this._subscribeTo(key);
                this._subscriptions[key] = {};
            }
            this._subscriptions[key][subscription.uniqueId] = fn;
            return subscription;
        },
        unsubscribeFrom: function unsubscribeFrom(key, subscription) {
            R.Debug.dev(R.scope(function() {
                assert(_.has(this._subscriptions, key), "R.Uplink.unsub(...): no such key.");
                assert(_.has(this._subscriptions[key], subscription.uniqueId), "R.Uplink.unsub(...): no such subscription.");
            }, this));
            delete this._subscriptions[key];
            if(_.size(this._subscriptions[key]) === 0) {
                delete this._subscriptions[key];
                this._unsubscribeFrom(key);
            }
        },
        _listenTo: function _listenTo(eventName) {
            co(function*() {
                yield this._promiseForHandshake;
                this._emit("listenTo", { eventName: eventName });
            }).call(this, R.Debug.rethrow("R.Uplink._listenTo: couldn't listen (" + eventName + ")"));
        },
        _unlistenFrom: function _unlistenFrom(eventName) {
            co(function*() {
                yield this._promiseForHandshake;
                this._emit("unlistenFrom", { eventName: eventName });
            }).call(this, R.Debug.rethrow("R.Uplink._unlistenFrom: couldn't unlisten (" + eventName + ")"));
        },
        listenTo: function listenTo(eventName, fn) {
            var listener = R.Uplink.Listener(eventName);
            if(!_.has(this._listeners, eventName)) {
                this._listenTo(eventName);
                this._listeners[eventName] = {};
            }
            this._listeners[eventName][listener.uniqueId] = fn;
            return listener;
        },
        unlistenFrom: function unlistenFrom(eventName, listener) {
            R.Debug.dev(R.scope(function() {
                assert(_.has(this._listeners, eventName), "R.Uplink.removeListener(...): no such eventName.");
                assert(_.has(this._listeners[eventName], listener.uniqueId), "R.Uplink.removeListener(...): no such listener.");
            }, this));
            delete this._listeners[eventName];
            if(_.size(this._listeners[eventName]) === 0) {
                delete this._listeners[eventName];
                this._unlistenFrom(eventName);
            }
        },
        fetch: function fetch(key) {
            return R.scope(function(fn) {
                request({
                    url: url.resolve(this._httpEndpoint, key),
                    method: "GET",
                    json: true,
                    withCredentials: false,
                }, function(err, res, body) {
                    return err ? fn(err) : fn(null, body);
                });
            }, this);
        },
        dispatch: function dispatch(action, params) {
            return R.scope(function(fn) {
                request({
                    url: url.resolve(this._httpEndpoint, key),
                    body: { guid: this._guid, params: params },
                    json: true,
                    withCredentials: false,
                }, function(err, res, body) {
                    return err ? fn(err) : fn(null, body);
                });
            }, this);
        },
        destroy: function destroy() {
            if(R.isClient()) {
                this._destroyInClient();
            }
            if(R.isServer()) {
                this._destroyInServer();
            }
        },
    });

    _.extend(Uplink, {
        Subscription: function Subscription(key) {
            this.key = key;
            this.uniqueId = _.uniqueId("R.Uplink.Subscription");
        },
        Listener: function Listener(eventName) {
            this.eventName = eventName;
            this.uniqueId = _.uniqueId("R.Uplink.Listener");
        },
    });

    R.Uplink = Uplink;
    return R;
};
