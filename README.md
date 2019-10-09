# mini-react

> 基于 React Fiber 的实现

代码示例：https://codesandbox.io/s/github/cxphoe/mini-react

## Features

- [x] vnode 实现（React.createElement 实现)
- [x] fiber node 实现
- [x] reconcile 调和
- [x] 事件委托处理
  - 实现的事件:
    - onClick
    - onInput
    - onKeyDown
    - onKeyPress
    - onKeyUp
    - onMouseOver
    - onMouseOut
- [x] 类组件
  - [x] 生命周期
  - [x] setState
    - [x] 异步更新（批量合并处理，在生命周期内/在事件回调中）
    - [x] 同步更新 (异步回调中的处理)
- [ ] 函数组件
  - [ ] hook
    - [ ] useState
    - [ ] useReducer
    - [ ] useEffect
- [ ] 调度

## Build

```
yarn build
```
