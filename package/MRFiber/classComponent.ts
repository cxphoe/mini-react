import { FiberNode } from './fiber'
import { markPlacement, markUpdate, EffectTag, markPerformedWork } from './tag'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { reuseAlreadyFinishedWork } from './beginWork'
import { reconcileChildren } from './reconcile'
import { NoWork } from '../MRScheduler'

const instanceKey = '__mr_instance'
const setInstance = (key: any, value: FiberNode) => (key[instanceKey] = value)
const getInstance = (key: any): FiberNode => key[instanceKey]

const updateClassComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: MR.ComponentClass,
  nextProps: any,
  renderExpirationTime: number
) => {
  let instance = workInProgress.stateNode
  let shouldUpdate = false

  if (instance === null) {
    if (current !== null) {
      current.alternate = null
      workInProgress.alternate = null
      markPlacement(workInProgress)
    }

    constructClassInstance(workInProgress, Component, nextProps)
    mountClassInstance(workInProgress, Component, nextProps, renderExpirationTime)
    shouldUpdate = true
  } else {
    shouldUpdate = updateClassInstance(current, workInProgress, Component, nextProps, renderExpirationTime)
  }

  let next = finishClassComponent(current, workInProgress, shouldUpdate, renderExpirationTime)
  return next
}

const constructClassInstance = (
  workInProgress: FiberNode,
  Component: MR.ComponentClass,
  nextProps: any,
) => {
  let instance = new Component(nextProps)
  workInProgress.memoizedState = instance.state !== null && instance.state !== undefined
    ? instance.state
    : null
  adoptClassInstance(workInProgress, instance)

  return instance
}

const adoptClassInstance = (workInProgress: FiberNode, instance: MR.Component) => {
  workInProgress.stateNode = instance
  setInstance(instance, workInProgress)
}

const mountClassInstance = (
  workInProgress: FiberNode,
  Component: MR.ComponentClass,
  nextProps: any,
  expirationTime: number,
) => {
  let instance = workInProgress.stateNode as MR.Component
  instance.state = workInProgress.memoizedState
  ;(instance as any).props = nextProps


  let updateQueue = workInProgress.updateQueue as UpdateQueue
  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, nextProps, instance, expirationTime)
    instance.state = workInProgress.memoizedState
  }

  if (typeof Component.getDerivedStateFromProps === 'function') {
    applyDerivedStateFromProps(workInProgress, Component.getDerivedStateFromProps, nextProps)
    instance.state = workInProgress.memoizedState
  }

  if (typeof instance.componentDidMount === 'function') {
    markUpdate(workInProgress)
  }
}

const updateClassInstance = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: MR.ComponentClass,
  nextProps: any,
  expirationTime: number,
) => {
  let instance = workInProgress.stateNode as MR.Component
  let prevProps = workInProgress.memoizedProps
  ;(instance as any).props = prevProps


  let oldState = workInProgress.memoizedState
  let newState = instance.state = oldState
  let updateQueue = workInProgress.updateQueue as UpdateQueue

  if (updateQueue !== null) {
    processUpdateQueue(workInProgress, updateQueue, nextProps, instance, expirationTime)
    newState = workInProgress.memoizedState
  }

  if (prevProps === nextProps && oldState === newState) {
    if (current) {
      if (typeof instance.componentDidUpdate === 'function') {
        if (prevProps !== current.memoizedProps || oldState !== current.memoizedState) {
          workInProgress.effectTag |= EffectTag.Update
        }
      }

      if (typeof instance.getSnapshotBeforeUpdate === 'function') {
        if (prevProps !== current.memoizedProps || oldState !== current.memoizedState) {
          workInProgress.effectTag |= EffectTag.Snapshot
        }
      }
    }

    return false
  }

  if (typeof Component.getDerivedStateFromProps === 'function') {
    applyDerivedStateFromProps(workInProgress, Component.getDerivedStateFromProps, nextProps)
    newState = workInProgress.memoizedState
  }

  let shouldUpdate = checkShouldComponentUpdate(workInProgress, Component, prevProps, nextProps, oldState, newState)

  if (shouldUpdate) {
    if (typeof instance.componentWillUpdate === 'function') {
      instance.componentWillUpdate()
    }

    if (typeof instance.componentDidUpdate === 'function') {
      workInProgress.effectTag |= EffectTag.Update
    }

    if (typeof instance.getSnapshotBeforeUpdate === 'function') {
      workInProgress.effectTag |= EffectTag.Snapshot
    }
  }

  (instance as any).props = nextProps
  instance.state = newState
  return shouldUpdate
}

const applyDerivedStateFromProps = (
  workInProgress: FiberNode,
  getDerivedStateFromProps: (nextProps: any, prevState: any) => any,
  props: any,
) => {
  let prevState = workInProgress.memoizedState
  let partialState = getDerivedStateFromProps(props, prevState)

  let resultState = {
    ...prevState,
    ...partialState || {},
  }

  workInProgress.memoizedState = resultState

  let queue = workInProgress.updateQueue as UpdateQueue
  if (queue && workInProgress.expirationTime === NoWork) {
    queue.baseState = resultState
  }
}

const checkShouldComponentUpdate = (
  workInProgress: FiberNode,
  Component: MR.ComponentClass,
  prevProps: any,
  nextProps: any,
  prevState: any,
  nextState: any,
) => {
  let instance = workInProgress.stateNode as MR.Component

  if (typeof instance.shouldComponentUpdate === 'function') {
    let shouldUpdate = instance.shouldComponentUpdate(nextProps, nextState, {})
    return shouldUpdate
  }

  return true
}

const finishClassComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  shouldUpdate: boolean,
  expirationTime: number,
) => {
  if (!shouldUpdate) {
    return reuseAlreadyFinishedWork(current, workInProgress, expirationTime)
  }

  let instance = workInProgress.stateNode as MR.Component
  let nextChildren = instance.render()
  markPerformedWork(workInProgress)
  reconcileChildren(current, workInProgress, nextChildren)
  workInProgress.memoizedState = instance.state
  return workInProgress.child
}

export {
  updateClassComponent,
  setInstance,
  getInstance,
}
