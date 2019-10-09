import { FiberNode } from './fiber'
import { reconcileChildren } from './reconcile'
import { hasReceivedUpdate, reuseAlreadyFinishedWork } from './beginWork'
import { markPerformedWork } from './tag'
import { renderWithHooks, bailoutHooks } from './hook'

const updateFunctionComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: MR.FunctionComponent,
  nextProps: any,
  renderExpirationTime: number,
) => {
  // let nextChildren = Component(nextProps)
  let nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    renderExpirationTime,
  )
  if (current !== null && !hasReceivedUpdate()) {
    bailoutHooks(current, workInProgress, renderExpirationTime)
    return reuseAlreadyFinishedWork(current, workInProgress, renderExpirationTime)
  }

  markPerformedWork(workInProgress)
  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

export {
  updateFunctionComponent,
}
