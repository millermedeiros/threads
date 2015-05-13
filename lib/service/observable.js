'use strict';

/**
 * Dependencies
 */

var Messenger = require('../messenger');

/**
 * Exports
 */

module.exports = ServiceObservable;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ServiceObservable]') : function() {};

/**
 * Writable Observable instance passed to the
 * `service.observable` implementation
 *
 * @param {Object} options
 * @param {String} options.id Observable ID used to sync client and service observables
 * @param {BroadcastChannel} options.channel Channel used to postMessage
 * @param {String} options.serviceId ID of the service
 * @param {String} options.clientId ID of client that should receive message
 */

function ServiceObservable(options) {
  this._ = new PrivateServiceObservable(this, options);
}

/**
 * Services that allows clients to
 * cancel the operation before it's
 * complete should override the
 * `observable.cancel` method.
 *
 * @param {*} [reason] Data sent from client about the cancellation
 * @returns {(Promise|*)}
 */

ServiceObservable.prototype.cancel = function(reason) {
  var err = new TypeError('service should implement observable.cancel()');
  return Promise.reject(err);
};

/**
 * Signal to client that action was
 * aborted during the process, this
 * should be used as a way to
 * communicate errors.
 *
 * @param {*} [data] Reason of failure
 * @returns {Promise}
 */

ServiceObservable.prototype.abort = function(data) {
  debug('abort', data);
  return this._.post('abort', 'aborted', data);
};

/**
 * Sends a chunk of data to the client.
 *
 * @param {*} data Chunk of data to be sent to client.
 * @returns {Promise}
 */

ServiceObservable.prototype.write = function(data) {
  debug('write', data);
  return this._.post('write', 'writable', data);
};

/**
 * Closes the observable, signals that
 * action was completed with success.
 *
 * According to whatwg observables spec,
 * WritableObservable#close() doesn't send data.
 *
 * @returns {Promise}
 */

ServiceObservable.prototype.close = function() {
  debug('close');
  return this._.post('close', 'closed');
};

/**
 * Initialize a new `ClientObservablePrivate`.
 *
 * @param {ServiceObservable} target
 * @param {Object} options
 * @private
 */

function PrivateServiceObservable(target, options) {
  this.target = target;
  this.id = options.id;
  this.channel = options.channel;
  this.client = options.clientId;
  this.state = 'writable';
  this.messenger = new Messenger(options.serviceId, '[ServiceObservable]');
  debug('initialized', target, options);
}

/**
 * Validate the internal state to avoid
 * passing data to the client when observable
 * is already 'closed/aborted/canceled'.
 *
 * Returns a Observable to simplify the 'cancel'
 * & 'post' logic since they always need
 * to return promises.
 *
 * @param {String} actionName
 * @param {String} state
 * @returns {Promise}
 * @private
 */

PrivateServiceObservable.prototype.validateState = function(actionName, state) {
  if (this.state !== 'writable') {
    var msg = 'Can\'t ' + actionName + ' on current state: ' + this.state;
    return Promise.reject(new TypeError(msg));
  }

  this.state = state;
  return Promise.resolve();
};

/**
 * Validate the current state and
 * call cancel on the target observable.
 *
 * Called by the Service when client
 * sends a 'observablecancel' message.
 *
 * @param {*} [reason] Reason for cancelation sent by the client
 * @returns {Promise}
 * @private
 */

PrivateServiceObservable.prototype.cancel = function(reason) {
  return this.validateState('cancel', 'canceled').then(function() {
    return this.target.cancel(reason);
  }.bind(this));
};

/**
 * Validate the current state and post message to client.
 *
 * @param {String} type 'write', 'abort' or 'close'
 * @param {String} state 'writable', 'aborted' or 'closed'
 * @param {*} [data] Data to be sent to the client
 * @returns {Promise}
 * @private
 */

PrivateServiceObservable.prototype.post = function(type, state, data) {
  debug('post', type, state, data);
  return this.validateState(type, state).then(function() {
    debug('validated', this.channel);
    this.messenger.push(this.channel, {
      type: 'observableevent',
      recipient: this.client,
      data: {
        id: this.id,
        type: type,
        data: data
      }
    });
  }.bind(this));
};
