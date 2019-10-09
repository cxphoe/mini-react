import { FiberNode } from './fiber'
import { scheduleWork, Sync, NoWork } from '../MRScheduler'
import { UpdateQueue } from './updateQueue'
import { EffectTag } from './tag'
import { markReceivedUpdate } from './beginWork'

type HookReducer<S, A> = (state: S, action: A) => S;
interface HookQueue<S = {}, A = {}> {
  last: MR.HookUpdate<A> | null;
  dispatch: ((action: A) => void) | null;
  lastRenderedReducer: HookReducer<S, A>;
  lastRenderedState: S;
}
const createHook = <S, A>(): MR.Hook<S, A> => {
  return {
    memoizedState: null,
    baseState: null,
    queue: null,
    baseUpdate: null,
    next: null,
  }
}

const createHookUpdate = <A>(action: A): MR.HookUpdate<A> => {
  return {
    next: null,
    action,
  }
}

const createHookQueue = <S, A>(reducer: HookReducer<S, A>, state: S): HookQueue<S, A> => {
  return {
    last: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: state,
  }
}

let currentRenderingFiber: FiberNode | null
let workInProgressHook: MR.Hook<any, any> | null = null
let firstWorkInProgressHook: MR.Hook<any, any> | null = null
let nextWorkInProgressHook: MR.Hook<any, any> | null = null
let currentHook: MR.Hook<any, any> | null = null
let nextCurrentHook: MR.Hook<any, any> | null = null
let hookUpdateQueue: UpdateQueue | null = null
let sideEffectTag: number = EffectTag.NoEffect
let CurrentDispatcher: {
  current: {
    useState: typeof mountState;
    useReducer: typeof mountReducer;
  } | null;
} = {
  current: null,
}


const renderWithHooks = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: MR.FunctionComponent,
  nextProps: any,
  renderExpirationTime: number,
) => {
  currentRenderingFiber = workInProgress
  nextCurrentHook = current === null ? null : current.memoizedState
  if (nextCurrentHook !== null) {
    CurrentDispatcher.current = DispatchersOnUpdate as any
  } else {
    CurrentDispatcher.current = DispatchersOnMount
  }

  let children = Component(nextProps)

  let renderedWork = currentRenderingFiber
  renderedWork.memoizedState = firstWorkInProgressHook
  renderedWork.expirationTime = 0
  renderedWork.updateQueue = hookUpdateQueue
  renderedWork.effectTag |= sideEffectTag

  currentRenderingFiber = null
  currentHook = null
  nextCurrentHook = null
  firstWorkInProgressHook = null
  workInProgressHook = null
  nextWorkInProgressHook = null
  hookUpdateQueue = null
  sideEffectTag = 0

  return children
}

const bailoutHooks = (
  current: FiberNode,
  workInProgress: FiberNode,
  expirationTime: number,
) => {
  workInProgress.updateQueue = current.updateQueue
  workInProgress.effectTag &= ~(EffectTag.Passive | EffectTag.Update)
  if (current.expirationTime <= expirationTime) {
    current.expirationTime = NoWork
  }
}


const mountWorkInProgressHook = <S, A>() => {
  let hook = createHook<S, A>()

  if (workInProgressHook === null) {
    firstWorkInProgressHook = workInProgressHook = hook
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }

  return workInProgressHook as MR.Hook<S, A>
}

const updateWorkInProgressHook = <S, A>() => {
  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.
    workInProgressHook = nextWorkInProgressHook
    nextWorkInProgressHook = workInProgressHook.next
    // 旧节点的 hook 链
    currentHook = nextCurrentHook
    nextCurrentHook = currentHook !== null ? currentHook.next : null
  } else {
    // 复制
    currentHook = nextCurrentHook
    let newHook = createHook<S, A>()
    newHook.memoizedState = currentHook!.memoizedState
    newHook.baseState = currentHook!.baseState
    newHook.queue = currentHook!.queue
    newHook.baseUpdate = currentHook!.baseUpdate

    if (workInProgressHook === null) {
      // This is the first hook in the list.
      workInProgressHook = firstWorkInProgressHook = newHook
    } else {
      // Append to the end of the list.
      workInProgressHook = workInProgressHook.next = newHook
    }

    nextCurrentHook = currentHook!.next
  }

  return workInProgressHook
}


/** useReducer */


const mountReducer = <S = {}, A = {}>(
  reducer: HookReducer<S, A>,
  initialState: S,
): [S, MR.Dispatch<A>] => {
  let hook = mountWorkInProgressHook<S, A>()
  hook.memoizedState = hook.baseState = initialState
  let queue = hook.queue = createHookQueue(reducer, initialState)

  // 这里的 dispatch 将在整个生命周期中一直不变
  let dispatch = queue.dispatch = dispatchAction.bind(
    null,
    currentRenderingFiber,
    queue as any,
  ) as (action: A) => void
  return [hook.memoizedState, dispatch]
}

const updateReducer = <S = {}, A = {}>(
  reducer: HookReducer<S, A>,
  initialState: S,
): [S, MR.Dispatch<A>] => {
  let hook = updateWorkInProgressHook() as MR.Hook<S, A>
  let queue = hook.queue!

  queue.lastRenderedReducer = reducer

  let first: MR.HookUpdate<A> | null

  let { baseUpdate, baseState } = hook
  let { last } = queue
  if (baseUpdate !== null) {
    if (last !== null) {
      last.next = null
    }
    first = baseUpdate.next
  } else {
    first = last !== null ? last.next : null
  }

  let newState = baseState as S
  let prevUpdate = baseUpdate
  let update = first
  if (update) {
    do {
      let { action } = update
      newState = reducer(newState, action)

      prevUpdate = update
    } while (update !== null && update !== first)
  }

  if (!Object.is(newState, hook.memoizedState)) {
    markReceivedUpdate()
  }

  hook.memoizedState = newState
  hook.baseUpdate = prevUpdate
  hook.baseState = newState
  queue.lastRenderedState = newState

  let dispatch = queue.dispatch!
  return [hook.memoizedState, dispatch]
}

const dispatchAction = <S, A>(fiber: FiberNode, queue: HookQueue<S, A>, action: A) => {
  let { alternate } = fiber

  let update = createHookUpdate(action)
  let last = queue.last

  // 将 update 添加到 queue 中，这里不会直接触发更新，而是触发一次 renderRoot，等到调用 renderHook 的时候才会更新
  if (last === null) {
    update.next = update
  } else {
    let first = last.next
    if (first !== null) {
      update.next = first
    }

    last.next = update
  }
  queue.last = update

  scheduleWork(fiber, Sync)
}


/** useState  */

const BaseUpdateReducer = <S>(state: S, action: S) => {
  return typeof action === 'function'
    ? action(state)
    : action
}

const mountState = <S>(initialState: S | (() => S)) => {
  if (typeof initialState === 'function') {
    initialState = (initialState as any)() as S
  }

  return mountReducer<S, S>(BaseUpdateReducer, initialState as S)
}

const updateState = <S>(initialState: S) => {
  return updateReducer<S, S>(BaseUpdateReducer, initialState)
}



/** Dispatcher */


const DispatchersOnMount = {
  useState: mountState,
  useReducer: mountReducer,
}

const DispatchersOnUpdate = {
  useState: updateState,
  useReducer: updateReducer,
}

export {
  renderWithHooks,
  bailoutHooks,
  CurrentDispatcher,
}
