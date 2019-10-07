import { EffectTag } from './index'
import { NoWork } from '../MRScheduler'
import { UpdateQueue } from './updateQueue'
import { FiberTag } from './tag'

export interface FiberNode {
  elementType: null | MR.HTMLTags | MR.FunctionComponent | MR.ComponentClass,
  tag: number,
  stateNode: any,
  index: number,
  key: any,

  pendingProps: any,
  memoizedProps: any,
  memoizedState: any,
  updateQueue: null | any[] | UpdateQueue,

  return: null | FiberNode,
  sibling: null | FiberNode,
  child: null | FiberNode,
  alternate: null | FiberNode,

  effectTag: number,

  firstEffect: null | FiberNode,
  nextEffect: null | FiberNode,
  lastEffect: null | FiberNode,

  expirationTime: number,
  childExpirationTime: number,
}

const createFiber = (
  tag: number,
  pendingProps: any,
): FiberNode => {
  let key = null
  if (pendingProps && typeof pendingProps === 'object') {
    key = pendingProps.key
    delete pendingProps.key
    if (key === undefined) {
      key = null
    }
  }

  return {
    elementType: null,
    tag,
    stateNode: null,
    index: 0,
    key,

    pendingProps,
    memoizedProps: null,
    memoizedState: null,
    updateQueue: null,

    return: null,
    sibling: null,
    child: null,
    alternate: null,

    effectTag: EffectTag.NoEffect,

    firstEffect: null,
    nextEffect: null,
    lastEffect: null,

    expirationTime: NoWork,
    childExpirationTime: NoWork,
  }
}

const detachFiber = (fiber: FiberNode) => {
  fiber.return = fiber.child = fiber.sibling = null
  fiber.memoizedState = fiber.updateQueue = null
  let alternate = fiber.alternate
  fiber.alternate = null
  alternate && detachFiber(alternate)
}

const createFiberFromElement = (element: MR.MRElement): FiberNode => {
  let type = element.type
  let tag: number
  if (typeof type === 'string') {
    tag = FiberTag.HostComponent
  } else if ((type as any).__proto__.isClassComponent) {
    tag = FiberTag.ClassComponent
  } else {
    tag = FiberTag.FunctionComponent
  }

  let fiber = createFiber(tag, element.props)
  fiber.elementType = type
  return fiber
}

const createFiberFromText = (text: number | string): FiberNode => {
  let fiber = createFiber(FiberTag.HostText, text)
  return fiber
}

const createWorkInProgress = (fiber: FiberNode, pendingProps: any): FiberNode => {
  let workInProgress = fiber.alternate
  if (workInProgress === null) {
    workInProgress = createFiber(fiber.tag, pendingProps)
    workInProgress.elementType = fiber.elementType
    workInProgress.stateNode = fiber.stateNode
    // workInProgress.return = fiber.return
    workInProgress.alternate = fiber
    fiber.alternate = workInProgress
  } else {
    workInProgress.pendingProps = pendingProps
    workInProgress.effectTag = EffectTag.NoEffect
    workInProgress.firstEffect = workInProgress.lastEffect = null
    workInProgress.nextEffect = null
  }

  workInProgress.childExpirationTime = fiber.childExpirationTime
  workInProgress.expirationTime = fiber.expirationTime
  workInProgress.child = fiber.child
  workInProgress.sibling = fiber.sibling
  workInProgress.memoizedProps = fiber.memoizedProps
  workInProgress.memoizedState = fiber.memoizedState
  workInProgress.updateQueue = fiber.updateQueue

  return workInProgress
}

export {
  createFiber,
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
  detachFiber,
}
