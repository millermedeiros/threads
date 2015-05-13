/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('ServiceObservable /', function() {

  // we use these tests basically just to check edge cases, regular use cases
  // are handled by the client tests

  var observable;
  var lastMessage;

  setup(function() {
    observable = new threads.service.Observable({
      id: 'fake-observable-id',
      channel: {
        postMessage: function(msg) {
          lastMessage = msg.data;
          assert.include(['abort', 'close', 'write'], msg.data.data.type);
        }
      },
      serviceId: '123456',
      clientId: '123'
    });
  });

  function cancelObservable(reason) {
    return observable._.cancel(reason);
  }

  test('write + close + write', function(done) {
    observable.write('lorem').then(function() {
      assert.equal(lastMessage.data.data, 'lorem');
      observable.close();
      // write will be ignored
      observable.write('ipsum').catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
    }).then(done, done);
  });

  test('close + close', function(done) {
    observable.close().catch(function() { done('first call should succeed'); });
    observable.close()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        done();
      });
  });

  test('close + abort', function(done) {
    observable.close().catch(function() { done('first call should succeed'); });
    observable.abort()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
  });

  test('abort + abort', function(done) {
    observable.abort().catch(function() { done('first call should succeed'); });
    observable.abort()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        done();
      });
  });

  test('abort + close', function(done) {
    observable.abort().catch(function() { done('first call should succeed'); });
    observable.close()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  test('abort + write', function(done) {
    observable.abort().catch(function() { done('first call should succeed'); });
    observable.write('lorem ipsum')
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  suite('cancel /', function() {
    test('not implemented', function(done) {
      cancelObservable()
        .then(function() { done('cancel should fail'); })
        .catch(function(err) {
          assert.ok(err);
          done();
        });
    });

    suite('implemented /', function() {
      test('sync', function(done) {
        observable.cancel = function(reason) { assert.equal(reason, 'foo'); };
        cancelObservable('foo')
          .then(function() { done(); })
          .catch(function() { done('should not be called'); });
      });

      test('sync error', function(done) {
        observable.cancel = function(reason) {
          assert.equal(reason, 'with error');
          throw new Error('cancel error!');
        };
        cancelObservable('with error')
          .then(function() { done('this should not be called'); })
          .catch(function(err) {
            assert.ok(err);
            done();
          });
      });

      test('async success', function(done) {
        observable.cancel = function(reason) {
          assert.equal(reason, 'success');
          return Promise.resolve('canceled with success');
        };
        cancelObservable('success')
          .then(function(msg) {
            assert.equal(msg, 'canceled with success');
            done();
          });
      });

      test('async error', function(done) {
        observable.cancel = function(reason) {
          assert.equal(reason, 'foo');
          return Promise.reject(new Error('failed to cancel'));
        };
        cancelObservable('foo')
          .then(function() { done(new Error('should fail')); })
          .catch(function(err) {
            assert.ok(err);
            done();
          });
      });
    });
  });
});
