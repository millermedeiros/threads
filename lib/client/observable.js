'use strict';

/**
 * Dependencies
 */

var Emitter = require('../emitter');
var utils = require('../utils');

/**
 * Exports
 */

module.exports = ClientObservable;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ClientObservable]') : function() {};

/**
 * Readable observable instance returned by
 * a `client.observable('methodName')` call.
 *
 * @param {Object} options
 * @param {String} options.id Observable Id, used to match client/service observables
 * @param {Client} options.client Client instance
 */

function ClientObservable(options) {
  this._ = new ClientObservablePrivate(options);
}

/**
 * Promise that will be "resolved" when
 * observable is closed with success, and
 * "rejected" when service aborts
 * the action (abort == error).
 *
 * @type Promise
 */

Object.defineProperty(ClientObservable.prototype, 'closed', {
  get: function() { return this._.closed.promise; }
});

/**
 * Add a listener that will be called
 * every time the service broadcasts
 * a new chunk of data.
 *
 * @param {Function} callback
 */

ClientObservable.prototype.listen = function(callback) {
  debug('listen', callback);
  this._.emitter.on('write', callback);
};

/**
 * Removes 'data' listener
 *
 * @param {Function} callback
 */

ClientObservable.prototype.unlisten = function(callback) {
  debug('unlisten', callback);
  this._.emitter.off('write', callback);
};

/**
 * Notify the service that
 * action should be canceled
 *
 * @param {*} [reason] Optional data to be sent to service.
 */

ClientObservable.prototype.cancel = function(reason) {
  debug('cancel', reason);

  var canceled = utils.deferred();
  var client = this._.client;
  var id = this._.id;

  client.request('observablecancel', {
    id: id,
    reason: reason
  }).then(function(data) {
    delete client._activeObservables[id];
    canceled.resolve(data);
  }).catch(function(e) {
    // should delete the `_activeObservables`
    // reference even if it didn't succeed
    delete client._activeObservables[id];
    canceled.reject(e);
  });

  return canceled.promise;
};

/**
 * Initialize a new `ClientObservablePrivate`.
 *
 * @param {Object} options
 * @private
 */

function ClientObservablePrivate(options) {
  this.id = options.id;
  this.client = options.client;
  this.closed = utils.deferred();
  this.emitter = new Emitter();
  debug('initialized');
}

/**
 * Used internally by Client when
 * it receives an 'abort' event
 * from the service.
 *
 * @private
 */

ClientObservablePrivate.prototype.abort = function(reason) {
  debug('abort', reason);
  this.closed.reject(reason);
};

/**
 * Used internally by Client when
 * it receives a 'close' event
 * from the service.
 *
 * @private
 */

ClientObservablePrivate.prototype.close = function() {
  debug('close');
  this.closed.resolve();
};

/**
 * Used internally by Client when
 * it receives a 'write' event
 * from the service.
 *
 * @private
 */

ClientObservablePrivate.prototype.write = function(data) {
  debug('write', data);
  this.emitter.emit('write', data);
};
