var assert = require('should');
var store = require('../index');
var local = store.local;

describe('localStore', function () {
  beforeEach(function () {
    local.empty();
  });

  function setget(key, val) {
    local.set(key, val);
    assert.deepEqual(local.get(key), val);
  }

  describe('.get', function () {
    it('should return undefined when get not exists key', function () {
      assert.equal(local.get('foo'), undefined);
    });

    it('should return what you setted', function () {
      assert.equal(local.get('foo'), undefined);
      setget('foo', 'string');
      setget('foo', 1);
      setget('foo', null);
      setget('foo', true);
      setget('foo', {a: 'aaa'});
      setget('foo', []);
      setget('foo', [1, 2]);
    });

  });
  describe('.set', function () {
    it('should add or overwrite a key', function () {
      assert.equal(local.get('foo'), undefined);
      setget('foo', 'string');
      setget('foo', 1);
    });

    it('should support expired', function (done) {
      local.set('foo', 'a', -1); // 小于 0 的数不会缓存
      assert.equal(localStorage.__local_foo, undefined);
      assert.equal(local.get('foo'), undefined);
      assert.equal(localStorage.__local_foo, undefined);

      local.set('foo', 'b', 0.004); // 4 ms 后过期
      assert.equal(local.get('foo'), 'b');
      setTimeout(function () {
        assert.notEqual(localStorage.__local_foo, undefined);
        assert.equal(local.get('foo'), undefined);
        assert.equal(localStorage.__local_foo, undefined);
        done();
      }, 10);
    });
  });
  describe('.del', function () {
    it('should delete any key', function () {
      local.set('foo', 'a');
      local.get('foo').should.eql('a');
      local.del('foo');
      assert.equal(local.get('foo'), undefined);
    });
  });
  describe('.empty', function () {
    it('should empty all setted key', function () {
      local.set('foo', 'a');
      local.set('bar', 'b');
      local.empty();
      assert.equal(local.get('foo'), undefined);
      assert.equal(local.get('bar'), undefined);
    });
  });
});


describe('cacheStore', function () {
  beforeEach(function () {
    store.empty(true);
  });
  describe('.local', function () {
    it('should equal localStore', function () {
      assert.equal(store.local, local);
    });
  });

  describe('.get', function () {
    it('should return undefined when not exists', function () {
      assert.equal(store.get('bar', undefined));
    });

    it('should return what you have setted', function () {
      store.set('bar', 'a');
      store.get('bar').should.eql('a');

      store.set('bar', 'b');
      store.get('bar').should.eql('b');
    });

    it('should support get value exists in localStorage but not cache', function () {
      store.set('bar', 'a', true);
      store.del('bar');
      assert.equal(store.get('bar'), undefined);
      assert.equal(store.get('bar', true), 'a');
    });
  });
  describe('.set', function () {
    it('should support any key', function () {
      store.set('bar', 'any');
      store.get('bar').should.eql('any');
    });

    it('should support set to localStorage', function () {
      store.set('bar', 'any2', true);
      store.getFromLocal('bar').should.eql('any2');
    });

    it('should trigger "added" event when set a new key', function (done) {
      var fn = function (e) {
        e.type.should.eql('added');
        e.newVal.should.eql('x');
        assert.equal(e.oldVal, undefined);
        store.off('bar');
        done();
      };
      store.on('bar', fn);
      store.set('bar', 'x');
    });

    it('should trigger "updated" event when set an exists key', function (done) {
      store.set('bar', 'y');
      store.on('bar', function (e) {
        e.type.should.eql('updated');
        e.newVal.should.eql('z');
        e.oldVal.should.eql('y');
        store.off('bar');
        done();
      });
      store.set('bar', 'z');
    });

  });
  describe('.del', function () {
    it('should remove from cache', function () {
      store.set('bar', 'bbb');
      store.del('bar');
      assert.equal(store.get('bar'), undefined);
    });
    it('should remove from local', function () {
      store.set('bar', 'xxx');
      store.saveToLocal('bar');
      store.getFromLocal('bar').should.eql('xxx');
      store.del('bar', true);
      assert.equal(store.get('bar', true));
    });
    it('should trigger deleted event', function (done) {
      store.set('bar', 'yyy');
      store.on('bar', function (e) {
        e.type.should.eql('deleted');
        assert.equal(e.newVal, undefined);
        assert.equal(e.oldVal, 'yyy');
        store.off('bar');
        done();
      });
      store.del('bar');
    });
  });
  describe('.empty', function () {
    it('should empty all cache', function () {
      store.set('a', 'a');
      store.set('b', 'b', true);
      store.empty();
      assert.equal(store.get('a'), undefined);
      assert.equal(store.get('b'), undefined);
      assert.equal(store.get('b', true), 'b');
    });
    it('should empty all local', function () {
      store.set('a', 'a', true);
      store.set('b', 'b', true);
      store.empty(true);
      assert.equal(store.get('a', true), undefined);
      assert.equal(store.get('b', true), undefined);
    });
  });


  describe('.on', function () {
    it('should exec all callbacks in order', function (done) {
      var order = 1;
      store.on('a', function () {
        order.should.eql(1);
        order++;
      });
      store.on('a', function () {
        order.should.eql(2);
        store.off('a');
        done();
      });

      store.set('a', 'aa');
    });
  });
  describe('.off', function () {
    it('should off bind specified callback', function () {
      var val = 1;
      var fn = function () {
        val = 2;
      };

      store.on('b', fn);
      store.off('b', fn);

      store.set('b', 'b');

      val.should.eql(1);
    });
    it('should off all binded callbacks', function () {
      var val = 1;

      store.on('b', function () { val = 3; });
      store.on('b', function () { val = 4; });
      store.off('b');
      store.set('b', 'b');

      val.should.eql(1);
    });
  });

  describe('.saveToLocal', function () {
    it('should just save an exists key', function () {
      store.saveToLocal('k');
      assert.equal(store.get('k', true), undefined);
      store.set('k', 'kk');
      store.saveToLocal('k');
      store.getFromLocal('k').should.eql('kk');
    });
  });
  describe('.getFromLocal', function () {
    it('should return localStorage values', function () {
      assert.equal(store.getFromLocal('t'), undefined);
      store.set('t', 'tt', true);
      store.getFromLocal('t').should.eql('tt');
    });
  });
  describe('.removeFromLocal', function () {
    it('should remove values from localStorage', function () {
      store.set('r', 'rr', true);
      store.del('r');
      store.getFromLocal('r').should.eql('rr');
      assert.equal(store.get('r'), undefined);
    });
  });
  describe('.map', function () {

    it('should support map', function (done) {
      var comp = {setState: function (obj) {
        assert.deepEqual(obj, {b: 'aaa'});
        store.unmap('a');
        done();
      }};
      store.map('a', 'b', comp);
      store.set('a', 'aaa');
    });

    it('should support map filter', function (done) {
      var comp = {setState: function (obj) {
        assert.deepEqual(obj, {d: 'xxx'});
        store.unmap('c');
        done();
      }};
      store.map('c', 'd', comp, function (val) { return val.x; });
      store.set('c', {x: 'xxx'});
    });

    it('should support multiple map', function () {
      var result = '';
      store.map('a', 'b', {setState: function (o) { result += o.b; }});
      store.map('a', 'c', {setState: function (o) { result += o.c; }});

      store.set('a', 'aaa');

      result.should.eql('aaaaaa');
    });

  });
  describe('.unmap', function () {
    it('should support unmap all specified key', function () {
      var val = 1;
      var comp = {setState: function (obj) { val = 2; }};
      store.map('a', 'a', comp);
      store.map('a', 'b', comp);
      store.unmap('a');
      val.should.eql(1);
    });
    it('should support unmap all specified key and stateKey', function () {
      var val = 1;
      var comp = {setState: function (obj) { val = 2; }};
      store.map('a', 'c', comp);
      store.map('a', 'c', comp);
      store.unmap('a', 'c');
      val.should.eql(1);
    });
    it('should support unmap all specified key and stateKey and component', function () {
      var val = 1;
      var comp = {setState: function (obj) { val = 2; }};
      store.map('a', 'e', comp);
      store.map('a', 'e', comp);
      store.unmap('a', 'e', comp);
      val.should.eql(1);
    });
  });
});
