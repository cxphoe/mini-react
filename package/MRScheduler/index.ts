import { FiberNode } from '../MRFiber/fiber'
import { getFiberRoot, FiberRootNode } from '../MRFiber/fiberRoot'
import { renderRoot } from '../MRFiber/work'

export const NoWork = 0
export const Sync = 1


let isFlushingSyncQueue = false
let syncQueue: (() => void)[] | null = null

const markExpirationTimeBranch = (
  fiber: FiberNode,
  expirationTime: number,
) => {
  fiber.expirationTime = expirationTime
  let parent = fiber.return

  if (parent) {
    while (parent.return) {
      parent.childExpirationTime = expirationTime
      parent = parent.return
    }
    parent.childExpirationTime = (parent.stateNode as FiberRootNode).childExpirationTime = expirationTime
  } else {
    (fiber.stateNode as FiberRootNode).childExpirationTime = expirationTime
  }
}

const markExpirationTimeToRoot = (fiber: FiberNode, expirationTime: number) => {
  markExpirationTimeBranch(fiber, expirationTime)
  fiber.alternate && markExpirationTimeBranch(fiber.alternate, expirationTime)
}

const scheduleWork = (fiber: FiberNode, expirationTime: number) => {
  markExpirationTimeToRoot(fiber, expirationTime)
  let root = getFiberRoot(fiber)
  if (expirationTime === Sync) {
    scheduleCallbackForRoot(root, expirationTime)
    flushSyncCallbackQueue()
  }
}

const scheduleCallbackForRoot = (root: FiberRootNode, expirationTime: number) => {
  if (root.callback) {
    return
  }

  let callback = () => {
    renderRoot(root, expirationTime)
    root.callback = null
  }
  root.callback = callback

  if (!syncQueue) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

const flushSyncCallbackQueue = () => {
  if (isFlushingSyncQueue) {
    return
  }

  if (syncQueue) {
    isFlushingSyncQueue = true
    for (let callback of syncQueue) {
      callback()
    }
    syncQueue = null
    isFlushingSyncQueue = false
  }
}

export {
  flushSyncCallbackQueue,
  scheduleWork,
}
