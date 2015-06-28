/* global localStorage, define */

(function (root, factory) {

  if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.cacheStore = factory();

})(typeof window === 'object' ? window : this, function () {

  var _data = {},
    _events = {},
    _mapBinds = [],
    cacheStore, localStore;

  var LOCAL_PREFIX = '__local_',
    nativeStore = localStorage;

  function trigger(key, type, oldVal) {
    if (key in _events) {
      _events[key].forEach(function (callback) {
        callback({type: type, key: key, newVal: _data[key], oldVal: oldVal});
      });
    }
  }

  function emptyFilter(val) {
    return val;
  }

  localStore = {
    set: function (key, val, expiredAfterSeconds) {
      if (expiredAfterSeconds && expiredAfterSeconds < 0) return this;

      var expiredAt = !expiredAfterSeconds ? 0 : Date.now() + expiredAfterSeconds * 1000;
      nativeStore.setItem(LOCAL_PREFIX + key, JSON.stringify({ val: val, expiredAt: expiredAt }));

      return this;
    },
    get: function (key) {
      var data = nativeStore.getItem(LOCAL_PREFIX + key);
      if (data) {
        try {
          data = JSON.parse(data);
          if (!data.expiredAt || Date.now() < data.expiredAt) {
            return data.val;
          } else if (data.expiredAt) {
            localStore.del(key);
          }

        } catch (e) {}
      }
    },
    del: function (key) {
      nativeStore.removeItem(LOCAL_PREFIX + key);
      return this;
    },
    empty: function () {
      var key;
      for (key in nativeStore) {
        if (key.indexOf(LOCAL_PREFIX) === 0) {
          localStore.del(key.substr(LOCAL_PREFIX.length));
        }
      }
    }
  };

  cacheStore = {

    local: localStore,

    set: function (key, val, saveToLocal) {
      var oldVal = _data[key];
      if (oldVal === val) return this;
      _data[key] = val;
      if (saveToLocal) cacheStore.saveToLocal(key);
      trigger(key, (oldVal === void 0) ? 'added' : 'updated', oldVal);
      return this;
    },

    get: function (key, getFromLocalIfNotExists) {
      var val = _data[key];
      return (val === void 0) && getFromLocalIfNotExists ? cacheStore.getFromLocal(key) : val;
    },

    del: function (key, removeFromLocal) {
      var oldVal = _data[key];
      delete _data[key];
      if (removeFromLocal) cacheStore.removeFromLocal(key);
      trigger(key, 'deleted', oldVal);
      return this;
    },

    empty: function (removeFromLocal) {
      for (var key in _data) {
        cacheStore.del(key, removeFromLocal);
      }
    },

    saveToLocal: function (key) {
      var val = cacheStore.get(key);
      if (val !== void 0) localStore.set('cache_' + key, val);
      return this;
    },

    getFromLocal: function (key) {
      return localStore.get('cache_' + key);
    },

    removeFromLocal: function (key) {
      localStore.del('cache_' + key);
      return this;
    },

    on: function (key, callback) {
      if (key in _events) _events[key].push(callback);
      else _events[key] = [callback];
      return this;
    },

    off: function (key, callback) {
      if (_events[key]) {
        if (callback) {
          var index = _events[key].indexOf(callback);
          if (index >= 0) _events[key].splice(index, 1);
        } else {
          _events[key].length = 0;
          delete _events[key];
        }
      }
      return this;
    },

    map: function (key, stateKey, component, filter) {
      if (typeof filter !== 'function') filter = emptyFilter;
      var callback = function (e) {
        var state = {};
        state[stateKey] = filter(e.newVal);
        component.setState(state);
      };
      _mapBinds.push([key, stateKey, component, callback]);
      cacheStore.on(key, callback);
      return this;
    },

    unmap: function (key, stateKey, component) {
      var i, bind;

      for (i = _mapBinds.length; i > 0; i--) {
        bind = _mapBinds[i - 1];
        if (bind[0] === key && (!stateKey || bind[1] === stateKey) && (!component || bind[2] === component)) {
          cacheStore.off(key, bind[3]);
          _mapBinds.splice(i - 1, 1);
          bind.length = 0;
        }
      }
      return this;
    }
  };

  return cacheStore;
});
