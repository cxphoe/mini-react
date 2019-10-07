import { FiberNode } from './fiber'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import { reuseAlreadyFinishedWork } from './beginWork'
import { FiberRootNode } from './fiberRoot'
import { reconcileChildren } from './reconcile'

const updateHostRoot = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderExpirationTime: number,
) => {

  let updateQueue = workInProgress.updateQueue as UpdateQueue

  let nextProps = workInProgress.pendingProps
  let prevState = workInProgress.memoizedState
  let prevChildren = prevState !== null
    ? prevState.element
    : null

  processUpdateQueue(workInProgress, updateQueue, nextProps, null, renderExpirationTime)

  let nextState = workInProgress.memoizedState
  let nextChildren = nextState.element
  if (prevChildren === nextChildren) {
    return reuseAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  // let root = workInProgress.stateNode as FiberRootNode

  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

export {
  updateHostRoot,
}
