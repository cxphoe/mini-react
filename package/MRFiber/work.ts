import { FiberRootNode } from './fiberRoot'
import { Sync, flushSyncCallbackQueue } from '../MRScheduler'
import { FiberNode, createWorkInProgress } from './fiber'
import { FiberTag, markUpdate, EffectTag } from './tag'
import { completeHostComponent, createDomInstance, createTextInstance } from './host'
import { enqueueEffect } from './effect'
import { beginWork } from './beginWork'
import { commitRoot } from './commit'

let renderExpirationTime = Sync

const prepareFreshStack = (root: FiberRootNode) => {
  createWorkInProgress(root.current, null)
}

const renderRoot = (root: FiberRootNode, expirationTime: number) => {
  prepareFreshStack(root)
  workLoop(root)
  commitRoot(root)
  flushSyncCallbackQueue()
}

const workLoop = (root: FiberRootNode) => {
  let workInProgress = root.current.alternate
  while (workInProgress) {
    workInProgress = performUnitOfWork(workInProgress)
  }
}

const performUnitOfWork = (unitOfWork: FiberNode): FiberNode | null => {
  let current = unitOfWork.alternate

  let next = beginWork(current, unitOfWork, renderExpirationTime)

  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    next = completeUnitOfWork(unitOfWork)
  }

  return next
}

const completeUnitOfWork = (unitOfWork: FiberNode) => {
  let workInProgress: FiberNode | null = unitOfWork

  while (workInProgress !== null) {
    let current = workInProgress.alternate
    completeWork(current, workInProgress, Sync)

    bubbleUpEffect(workInProgress)

    if (workInProgress.sibling) {
      return workInProgress.sibling
    }

    workInProgress = workInProgress.return
  }

  return null
}


/**
 * 对副作用节点链从当前节点 fiber 中收集到父节点中去（冒泡处理）。
 * @param fiber 要讲带有副作用节点做冒泡处理的节点
 */
const bubbleUpEffect = (fiber: FiberNode) => {
  let parentFiber = fiber.return
  if (!parentFiber) {
    return
  }

  // 收集已经有的副作用链
  if (fiber.firstEffect) {
    if (parentFiber.lastEffect) {
      parentFiber.lastEffect.nextEffect = fiber.firstEffect
    } else {
      parentFiber.firstEffect = fiber.firstEffect
    }
    parentFiber.lastEffect = fiber.lastEffect
  }

  // 如果当前节点有副作用，就添加到副作用链中
  if (fiber.effectTag > EffectTag.PerformedWork) {
    enqueueEffect(parentFiber, fiber)
  }
}

const completeWork = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  expirationTime: number,
) => {
  let newProps = workInProgress.pendingProps
  let type = workInProgress.elementType

  switch (workInProgress.tag) {
    case FiberTag.HostComponent: {
      completeHostComponent(current, workInProgress, type as MR.HTMLTags, newProps)
      break
    }
    case FiberTag.HostText: {
      if (current !== null && workInProgress.stateNode) {
        let prevText = current.memoizedProps
        if (prevText !== newProps) {
          markUpdate(workInProgress)
        } else {
          workInProgress.stateNode = createTextInstance(newProps, workInProgress)
        }
      } else {
        workInProgress.stateNode = createTextInstance(newProps, workInProgress)
      }
      break
    }
  }
}

export {
  renderRoot,
}
