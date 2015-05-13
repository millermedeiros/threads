/*global threads*/


importScripts('../../threads.js');

try {

  // this file only contains the basic features of the service observable; to test
  // advanced error handling and edge cases we use the service-observable.test.js

  var service = threads.service('test-observables')
    .observable('test-data', function(observable, type, data) {
      observable.write('1: ' + type + ' ' + data);
      setTimeout(function() {
        observable.write(' | 2: this should also work');
        observable.close({ success: true });
      }, 10);
    })
    .observable('test-abort', function(observable, someArg) {
      setTimeout(function() {
        if (someArg === 123) {
          observable.abort('someArg should not equal 123');
        } else {
          observable.close();
        }
      }, 10);
    });

  service.observable('test-cancel', function(observable) {
    var timeout;
    // service can return a promise on `cancel` for async operations
    observable.cancel = function(reason) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      return Promise.resolve(reason + '!!!');
    };
    var count = 0;
    var send = function() {
      observable.write(++count);
      timeout = setTimeout(send, 5);
    };
    send();
  });

} catch(e) {
  console.log(e);
}

