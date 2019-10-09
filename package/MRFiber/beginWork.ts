import { FiberNode, createWorkInProgress } from './fiber'
import { NoWork } from '../MRScheduler'
import { FiberTag } from './tag'
import { updateHostComponent } from './host'
import { updateClassComponent } from './classComponent'
import { updateHostRoot } from './hostRoot'
import { updateFunctionComponent } from './fcComponent'

let didReceiveUpdate = false

const hasReceivedUpdate = () => {
  return didReceiveUpdate
}

const markReceivedUpdate = () => {
  didReceiveUpdate = true
}

const beginWork = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderExpirationTime: number,
) => {
  let updateTime = workInProgress.expirationTime

  if (current !== null) {
    let prevProps = current.memoizedProps
    let nextProps = workInProgress.pendingProps

    if (
      prevProps !== nextProps ||
      workInProgress.elementType !== current.elementType
    ) {
      didReceiveUpdate = true
    } else if (updateTime < renderExpirationTime) {
      didReceiveUpdate = false

      return reuseAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
    }
  } else {
    didReceiveUpdate = false
  }

  workInProgress.expirationTime = NoWork

  switch (workInProgress.tag) {
    case FiberTag.HostComponent: {
      return updateHostComponent(current, workInProgress)
    }
    case FiberTag.HostText: {
      return null
    }
    case FiberTag.HostRoot: {
      return updateHostRoot(current, workInProgress, renderExpirationTime)
    }
    case FiberTag.ClassComponent: {
      let ctor = workInProgress.elementType as MR.ComponentClass
      let nextProps = workInProgress.pendingProps
      return updateClassComponent(current, workInProgress, ctor, nextProps, renderExpirationTime)
    }
    case FiberTag.FunctionComponent: {
      let Component = workInProgress.elementType as MR.FunctionComponent
      let nextProps = workInProgress.pendingProps
      return updateFunctionComponent(current, workInProgress, Component, nextProps, renderExpirationTime)
    }
  }

  throw new Error('[beginWork]')
  return null
}

const reuseAlreadyFinishedWork = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderExpirationTime: number,
) => {
  let childExpirationTime = workInProgress.childExpirationTime

  if (childExpirationTime < renderExpirationTime) {
    // 说明子节点没有改动，不需要给 workInProgress 创建新的 child
    return null
  } else {
    cloneChildFibers(current, workInProgress)
    return workInProgress.child
  }
}

const cloneChildFibers = (current: FiberNode | null, workInProgress: FiberNode) => {
  if (workInProgress.child === null) {
    // 没有子节点可以复制
    return
  }

  let oldChild = workInProgress.child
  let newChild = createWorkInProgress(oldChild, oldChild.pendingProps)
  newChild.return = workInProgress
  workInProgress.child = newChild

  while (oldChild.sibling) {
    oldChild = oldChild.sibling
    newChild.sibling = createWorkInProgress(oldChild, oldChild.pendingProps)
    newChild = newChild.sibling
    newChild.return = workInProgress
  }

  newChild.sibling = null
}

export {
  beginWork,
  reuseAlreadyFinishedWork,
  hasReceivedUpdate,
  markReceivedUpdate,
}
