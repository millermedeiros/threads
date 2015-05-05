/*global threads,assert,suite,setup,teardown,test,sinon*/
/*jshint esnext:true, maxlen:false*/

suite('ChildThread', function() {
  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);
  });

  teardown(function() {
    this.sinon.restore();
    this.dom.remove();
  });

  test('It throws if the type is unknown', function() {
    this.sinon.spy(threads, 'create');

    try {
      var thread = threads.create({
        src: '/base/test/lib/view.html',
        type: 'unknowntype'
      });
    } catch (e) {}

    assert.isTrue(threads.create.getCall(0).threw());
  });

  suite('target /', function() {
    test('loaded iframe', function(done) {
      var iframe = document.createElement('iframe');
      iframe.src = '/base/test/lib/view.html';
      this.dom.appendChild(iframe);
      iframe.onload = function() {
        setTimeout(function() {
          var thread = threads.create({
            target: iframe,
            type: 'window'
          });

          var client = threads.client('little-browser', { thread: thread });

          client.method('getTitle').then(function(title) {
            assert.equal(title, 'page-title');
            done();
          });
        }, 100);
      };
    });

    test('unloaded iframe', function(done) {
      var iframe = document.createElement('iframe');
      iframe.src = '/base/test/lib/view.html';
      this.dom.appendChild(iframe);

      var thread = threads.create({
        target: iframe,
        type: 'window'
      });

      var client = threads.client('little-browser', { thread: thread });

      client.method('getTitle').then(function(title) {
        assert.equal(title, 'page-title');
        done();
      });
    });
  });
});
