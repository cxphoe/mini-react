import { UpdateTag, markCallback } from './tag'
import { FiberNode } from './fiber'
import { NoWork } from '../MRScheduler'

export interface Update {
  // expirationTime: number,
  tag: number,
  payload: any,
  callback: null | (() => void),
  next: null | Update,
  nextEffect: null | UpdateEffect | Update,
}

export interface UpdateQueue {
  baseState: any,
  firstUpdate: null | Update,
  lastUpdate: null | Update,
  firstEffect: null | UpdateEffect | Update,
  lastEffect: null | UpdateEffect | Update,
};

export interface UpdateEffect {
  tag: number,
  create: null | (() => (void | (() => void))),
  destroy: null | (() => void),
  deps: any,
  next: null | UpdateEffect,
  nextEffect: any,
};


const createUpdateQueue = (baseState: any): UpdateQueue => {
  return {
    baseState,
    firstEffect: null,
    lastEffect: null,
    firstUpdate: null,
    lastUpdate: null,
  }
}

const cloneUpdateQueue = (queue: UpdateQueue) => {
  let cloned: UpdateQueue = {
    baseState: queue.baseState,
    firstUpdate: queue.firstUpdate,
    lastUpdate: queue.lastUpdate,
    firstEffect: null,
    lastEffect: null,
  }
  return cloned
}

const createUpdate = (): Update => {
  return {
    tag: UpdateTag.Base,
    payload: null,
    next: null,
    callback: null,
    nextEffect: null,
  }
}

const ensureUpdateQueue = (fiber: FiberNode) => {
  let queue = (fiber.updateQueue) as UpdateQueue
  if (!queue && fiber.alternate && fiber.alternate.updateQueue) {
    queue = cloneUpdateQueue(fiber.alternate.updateQueue as UpdateQueue)
  }

  return queue || createUpdateQueue(fiber.memoizedState)
}

const appendUpdateToQueue = (queue: UpdateQueue, update: Update) => {
  if (queue.lastUpdate === null) {
    queue.firstUpdate = queue.lastUpdate = update
  } else {
    queue.lastUpdate.next = update
    queue.lastUpdate = update
  }
}

const enqueueUpdate = (fiber: FiberNode, update: Update) => {
  let alternate = fiber.alternate
  let queue1 = ensureUpdateQueue(fiber)
  let queue2 = null
  if (alternate) {
    queue2 = ensureUpdateQueue (alternate)
    alternate.updateQueue = queue2
  }
  fiber.updateQueue = queue1

  if (queue2 === null || queue1 === queue2) {
    appendUpdateToQueue(queue1, update)
  } else {
    appendUpdateToQueue(queue1, update)
    appendUpdateToQueue(queue2, update)
  }
}

const ensureCloneQueue = (workInProgress: FiberNode, queue: UpdateQueue) => {
  let {
    alternate: current,
  } = workInProgress

  if (current) {
    if (queue === current.updateQueue) {
      queue = workInProgress.updateQueue = cloneUpdateQueue(queue)
    }
  }

  return queue
}

const processUpdateQueue = (
  workInProgress: FiberNode,
  queue: UpdateQueue,
  newProps: any,
  instance: MR.Component | null,
  renderExpirationTime: number,
) => {
  queue = ensureCloneQueue(workInProgress, queue)
  let {
    baseState,
    firstUpdate: update,
  } = queue
  let resultState = baseState

  while (update !== null) {
    resultState = getStateFromUpdate(workInProgress, update, resultState, newProps, instance)
    let { callback } = update
    if (callback !== null) {
      markCallback(workInProgress)
      update.nextEffect = null

      if (queue.lastEffect === null) {
        queue.firstEffect = queue.lastEffect = update
      } else {
        queue.lastEffect.nextEffect = update
        queue.lastEffect = update
      }
    }

    update = update.next
  }

  queue.baseState = resultState
  queue.firstUpdate = queue.lastUpdate = null

  workInProgress.memoizedState = resultState
  workInProgress.expirationTime = NoWork
}

const getStateFromUpdate = (
  workInProgress: FiberNode,
  update: Update,
  prevState: any,
  nextProps: any,
  instance: MR.Component | null,
) => {
  let {
    payload,
  } = update
  let partialState = {}

  if (typeof payload === 'function') {
    partialState = payload.call(instance, prevState, nextProps)
  } else {
    partialState = payload
  }

  return {
    ...prevState,
    ...partialState || {},
  }
}

export {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
}
