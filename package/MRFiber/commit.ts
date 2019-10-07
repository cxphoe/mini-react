import { FiberRootNode } from './fiberRoot'
import { FiberNode, detachFiber } from './fiber'
import { EffectTag, FiberTag } from './tag'
import { enqueueEffect } from './effect'
import { setTextContent, unmountHostComponent, findHostParent, findHostSibling, findFirstHost, commitUpdate } from './host'
import { insertBefore, insertInContainerBefore, appendChildToContainer, appendChild } from './dom'
import { UpdateQueue, Update } from './updateQueue'

const snapshotInternalKey = '__mr_snapshot_key'

const commitRoot = (root: FiberRootNode) => {
  // flushPassiveEffects()

  root.callback = null
  let finishedWork = root.current.alternate as FiberNode

  if (finishedWork.effectTag > EffectTag.PerformedWork) {
    enqueueEffect(finishedWork, finishedWork)
  }

  let firstEffect = finishedWork.firstEffect

  if (firstEffect) {
    commitBeforeMutationEffects(firstEffect)
    commitMutationEffects(firstEffect)
    commitLayoutEffects(firstEffect)

    root.current = root.current.alternate as FiberNode

    // 清除 effect 引用
    let nextEffect: FiberNode | null = firstEffect
    while (nextEffect) {
      let next: FiberNode | null = nextEffect.nextEffect
      nextEffect.nextEffect = null
      nextEffect = next
    }
  }
}

const commitBeforeMutationEffects = (effect: FiberNode) => {
  let nextEffect: FiberNode | null = effect
  while (nextEffect) {
    if (nextEffect.effectTag & EffectTag.Snapshot) {
      commitBeforeMutationLifeCycles(nextEffect.alternate, nextEffect)
    }

    nextEffect = nextEffect.nextEffect
  }
}

const commitBeforeMutationLifeCycles = (
  current: FiberNode | null,
  finishedWork: FiberNode,
) => {
  switch (finishedWork.tag) {
    case FiberTag.FunctionComponent: {
      break
    }
    case FiberTag.ClassComponent: {
      if (current !== null) {
        let {
          memoizedProps: prevProps,
          memoizedState: prevState,
        } = current
        let instance = finishedWork.stateNode

        let snapshot = instance.getSnapshotBeforeUpdate(prevProps, prevState)
        instance[snapshotInternalKey] = snapshot
      }
      break
    }
  }
}

const commitMutationEffects = (effect: FiberNode) => {
  let nextEffect: FiberNode | null = effect
  while (nextEffect) {
    let tag = nextEffect.effectTag

    if (tag & EffectTag.ContentReset) {
      commitResetTextContent(nextEffect)
    }

    let partialTag = tag & (EffectTag.Placement | EffectTag.Update | EffectTag.Deletion)

    switch (partialTag) {
      case EffectTag.Placement: {
        commitPlacement(nextEffect)
        nextEffect.effectTag |= ~EffectTag.Placement

        break
      }
      case EffectTag.PlacementAndUpdate: {
        commitPlacement(nextEffect)
        nextEffect.effectTag |= ~EffectTag.Placement
        commitWork(nextEffect.alternate, nextEffect)
        break
      }
      case EffectTag.Update: {
        commitWork(nextEffect.alternate, nextEffect)
        break
      }
      case EffectTag.Deletion: {
        commitDeletion(nextEffect)
        break
      }
    }

    nextEffect = nextEffect.nextEffect
  }
}

const commitLayoutEffects = (effect: FiberNode) => {
  let nextEffect: FiberNode | null = effect
  while (nextEffect) {
    let tag = nextEffect.effectTag

    if (tag & (EffectTag.Update | EffectTag.Callback)) {
      let current = nextEffect.alternate
      commitLifeCycles(current, nextEffect)
    }

    nextEffect = nextEffect.nextEffect
  }
}


const commitLifeCycles = (current: FiberNode | null, finishedWork: FiberNode) => {
  switch (finishedWork.tag) {
    case FiberTag.ClassComponent: {
      let instance = finishedWork.stateNode as MR.Component
      if (finishedWork.effectTag & EffectTag.Update) {
        if (current === null) {
          instance.componentDidMount && instance.componentDidMount()
        } else {
          let prevProps = current.memoizedProps
          let prevState = current.memoizedState
          let snapshot = (instance as any)[snapshotInternalKey]
          instance.componentDidUpdate && instance.componentDidUpdate(prevProps, prevState, snapshot)
        }
      }

      let updateQueue = finishedWork.updateQueue
      if (updateQueue) {
        commitUpdateQueue(finishedWork, updateQueue as UpdateQueue, instance)
      }
      return
    }
    case FiberTag.HostRoot: {
      let updateQueue = finishedWork.updateQueue

      if (updateQueue !== null) {
        let instance = null

        if (finishedWork.child !== null) {
          switch (finishedWork.child.tag) {
            case FiberTag.HostComponent:
              instance = finishedWork.child.stateNode
              break
            case FiberTag.ClassComponent:
              instance = finishedWork.child.stateNode
              break
          }
        }

        commitUpdateQueue(finishedWork, updateQueue as UpdateQueue, instance)
      }
      return
    }
    case FiberTag.HostComponent: {
      if (current === null && finishedWork.effectTag & EffectTag.Update) {
      }
      return
    }
    case FiberTag.HostText: {
      return
    }
  }
}


const commitUpdateQueue = (finishedWork: FiberNode, queue: UpdateQueue, inst: MR.Component) => {
  commitUpdateEffects(queue.firstEffect as Update, inst)
  queue.firstEffect = queue.lastEffect = null
}

const commitUpdateEffects = (effect: Update, inst: MR.Component) => {
  while (effect) {
    let { callback } = effect
    if (callback) {
      callback.call(inst)
      effect.callback = null
    }

    effect = effect.nextEffect as Update
  }
}

const commitWork = (current: FiberNode | null, finishedWork: FiberNode) => {
  switch (finishedWork.tag) {
    case FiberTag.ClassComponent:
      return
    case FiberTag.HostComponent: {
      let instance = finishedWork.stateNode
      if (instance !== null) {
        let {
          memoizedProps: newProps,
          updateQueue,
          elementType: type,
        } = finishedWork
        finishedWork.updateQueue = null
        let oldProps = current ? current.memoizedProps : newProps

        if (updateQueue !== null) {
          commitUpdate(instance, updateQueue as [], type as MR.HTMLTags, oldProps, newProps)
        }
      }
      return
    }
    case FiberTag.HostText: {
      let instance = finishedWork.stateNode as Text
      let nextText = finishedWork.memoizedProps
      let prevText = current ? current.memoizedProps : nextText
      commitTextUpdate(instance, prevText, nextText)
      return
    }
    case FiberTag.HostRoot:
      return
  }

  console.error('[commitwork] 未知的类型:', finishedWork)
}

const commitTextUpdate = (node: Text, prevText: string, nextText: string) => {
  node.nodeValue = nextText
}

const commitResetTextContent = (fiber: FiberNode) => {
  setTextContent(fiber.stateNode, '')
}

const commitDeletion = (fiber: FiberNode) => {
  unmountHostComponent(fiber)
  detachFiber(fiber)
}

const commitPlacement = (fiber: FiberNode) => {
  let hostFiber = findFirstHost(fiber)
  if (!hostFiber) {
    return
  }


  let instance = hostFiber.stateNode as HTMLElement
  let parentHost = findHostParent(fiber)
  let inContainer = parentHost.stateNode instanceof FiberRootNode
  let parent = inContainer
    ? parentHost.stateNode.container as HTMLElement
    : parentHost.stateNode as HTMLElement

  if (parentHost.effectTag & EffectTag.ContentReset) {
    setTextContent(parent, '')
    parentHost.effectTag &= ~EffectTag.ContentReset
  }

  let siblingHost = findHostSibling(fiber)
  let siblingElement = siblingHost ? siblingHost.stateNode as HTMLElement : null

  if (inContainer) {
    if (siblingElement) {
      insertInContainerBefore(parent, instance, siblingElement)
    } else {
      appendChildToContainer(parent, instance)
    }
  } else {
    if (siblingElement) {
      insertBefore(parent, instance, siblingElement)
    } else {
      appendChild(parent, instance)
    }
  }
}

const commitUnmount = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case FiberTag.ClassComponent: {
      let instance = fiber.stateNode as MR.Component
      if (typeof instance.componentWillUnmount === 'function') {
        try {
          instance.componentWillUnmount()
        } catch (error) {
          console.error('[componentWillUnmount] ' + error)
        }
      }
    }
    case FiberTag.FunctionComponent: {
      /** @TODO */
    }
  }
}


export {
  commitRoot,
  commitUnmount,
}
