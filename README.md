# cache-store

数据缓存，支持 React 组件之间数据共享。

## USAGE

```js
var store = require('cache-store');

class Foo extends React.Component {
  constructor(props) {
    super(props);
    store.set('name', 'Foo'); // 触发 store 中的 name 值更新
  }
}

class Bar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {barName: ''};

    // 每次 store 中的 name 改变了， Bar 中的 barName 也会跟着改变
    store.map('name', 'barName', this);
  }

  componentWillUnmount() {
    store.unmap('fooName', 'barName'); // 取消绑定
  }

  render() {
    return <div>{this.state.barName}</div>
  }
}
```


## API

### local

对 localStorage 对象的一个封装，支持任意类型的 value，同时支持设置过期时间

#### local.set(key, val, [expiredAfterSeconds])
#### local.get(key)
#### local.del(key)
#### local.empty()

### set(key, val, [saveToLocal])
### get(key, [getFromLocalIfNotExists])
### del(key, [removeFromLocal])
### empty([removeFromLocal])
### on(key, callback)
### off(key, [callback])
### map(key, reactStateKey, reactComponent, [filter])
### unmap(key, [reactStateKey, [reactComponent]])
### saveToLocal(key)
### getFromLocal(key)
### removeFromLocal(key)
