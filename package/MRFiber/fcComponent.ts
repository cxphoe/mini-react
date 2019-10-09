import { FiberNode } from './fiber'
import { reconcileChildren } from './reconcile'
import { hasReceivedUpdate, reuseAlreadyFinishedWork } from './beginWork'
import { markPerformedWork } from './tag'

const updateFunctionComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: MR.FunctionComponent,
  nextProps: any,
  renderExpirationTime: number,
) => {
  let nextChildren = Component(nextProps)
  if (current !== null && !hasReceivedUpdate()) {
    return reuseAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  markPerformedWork(workInProgress)
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

export {
  updateFunctionComponent,
}
