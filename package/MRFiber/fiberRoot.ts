import { FiberNode, createFiber } from './fiber'
import { FiberTag } from './tag'
import { NoWork } from '../MRScheduler'

class FiberRootNode {
  container: HTMLElement
  current: FiberNode
  finishedWork: FiberNode | null = null
  callback: (() => void) | null = null
  expirationTime = NoWork
  childExpirationTime = NoWork

  constructor (container: HTMLElement, current: FiberNode) {
    this.container = container
    this.current = current
  }
}

const instanceKey = '__mr_root'

const setFiberRoot = (container: HTMLElement, root: FiberRootNode) => {
  (container as any)[instanceKey] = root
}

const createFiberRoot = (container: HTMLElement) => {
  let firstFiber = createHostRootFiber()
  let root = new FiberRootNode(container, firstFiber)
  firstFiber.stateNode = root
  setFiberRoot(container, root)
  return root
}

const createHostRootFiber = () => {
  return createFiber(FiberTag.HostRoot, null)
}

const getFiberRoot = (fiber: FiberNode) => {
  while (fiber.return) {
    fiber = fiber.return
  }
  return fiber.stateNode
}

export {
  FiberRootNode,
  createFiberRoot,
  getFiberRoot,
}
