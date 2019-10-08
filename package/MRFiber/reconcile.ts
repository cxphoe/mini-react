import { FiberNode, createFiberFromElement, createFiberFromText, createWorkInProgress, createFiber } from './fiber'
import { EffectTag, FiberTag } from './tag'
import { enqueueEffect } from './effect'

let shouldTrackSideEffects = false
let dummyFiber = createFiber(0, null)

/**
 * reconcile 的策略是直接删除原有的 dom 树，重新生成新的树
 * @param current 当前树的节点
 * @param workInProgress 正在渲染的节点
 * @param nextChildren workInProgress 的 children
 */
const reconcileChildren = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  nextChildren: MR.MRNode | MR.MRNode[],
): FiberNode | null => {
  shouldTrackSideEffects = current !== null

  return workInProgress.child = reconcileChildFibers(
    workInProgress,
    current ? current.child : null,
    nextChildren,
  )
}

const reconcileChildFibers = (
  parentFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  nextChildren: MR.MRNode | MR.MRNode[],
) => {
  if (typeof nextChildren === 'number' || typeof nextChildren === 'string') {
    return placeSingleChild(
      reconcileSingleTextNode(
        parentFiber,
        currentFirstChild,
        '' + nextChildren,
      )
    )
  }

  if (
    typeof nextChildren === 'object' &&
    nextChildren !== null
  ) {
    if (Array.isArray(nextChildren)) {
      return reconcileChildArray(parentFiber, currentFirstChild, nextChildren)
    }
    return placeSingleChild(
      reconcileSingleElement(parentFiber, currentFirstChild, nextChildren)
    )
  }

  deleteAllChildren(parentFiber, currentFirstChild)
  return null
}

const reconcileSingleTextNode = (
  parentFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  textContent: string,
) => {
  if (currentFirstChild !== null && currentFirstChild.tag === FiberTag.HostText) {
    // 已经有一个现存的节点了，把内容更新到该节点，剩下的其它节点可以删掉
    deleteAllChildren(parentFiber, currentFirstChild.sibling)
    let existing = useFiber(currentFirstChild, textContent)
    existing.return = parentFiber
    return existing
  }

  // 不存在可用的节点，就把所有节点都删掉
  deleteAllChildren(parentFiber, currentFirstChild)
  let newFiber = createFiberFromText(textContent)
  newFiber.return = parentFiber
  return newFiber
}

const reconcileSingleElement = (
  parentFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  element: MR.MRElement,
) => {
  let key = element.key
  let child = currentFirstChild

  while (child !== null) {
    if (child.key === key) {
      if (child.elementType === element.type) {
        deleteAllChildren(parentFiber, child.sibling)
        let existing = useFiber(child, element.props)
        existing.return = parentFiber
        return existing
      } else {
        deleteAllChildren(parentFiber, child)
        break
      }
    } else {
      deleteChild(parentFiber, child)
    }

    child = child.sibling
  }

  let newChildFiber = createFiberFromElement(element)

  newChildFiber.return = parentFiber
  return newChildFiber
}

const reconcileChildArray = (
  parentFiber: FiberNode,
  currentChild: FiberNode | null,
  nextChildren: MR.MRNode[],
) => {
  // 这里的操作涉及到 diff 策略
  // 会根据 key / index 来决定元素是否可以复用（判断旧节点的 key 与 elementType 跟新元素是否相同）。这里对节点的
  // 操作共有三种：
  //   1. 移动：在操作的过程中，会维持一个表示当前已经复用过的旧节点的最大 index（lastIndex)。在遍历新子元素，生成
  //           新节点数组的过程，会判断是否有旧节点可以复用，如果在复用旧节点的时候，发现这个旧节点的 index 小于这
  //           个 lastIndex，说明是要把这个旧节点移动到lastIndex 表示的节点之后，需要做移动处理
  //   2. 插入：如果新元素在旧节点数组中没有发现 key 相同且 elementType 相同的节点，就说明是新节点，做插入处理
  //   3. 删除：新元素数组处理完之后，没有复用到的旧节点就做删除处理

  dummyFiber.sibling = null
  /** reconcile 的结果 */
  let resultFirstChild: FiberNode = dummyFiber
  /** 上一个新建的 newFiber */
  let prevNewFiber: FiberNode = dummyFiber
  /** 已存在的节点 */
  let oldFiber: FiberNode | null = currentChild
  /**
   * 上一个旧节点的 index，用来判断当前复用的节点是否原来是位于 lastPlacedIndex 表示的节点之前的。
   * 如果是，就说明需要对节点中的 dom 元素进行移动（实际上只要对节点标识 Placement 中然后把元素添加到
   * lastPlacedIndex 中就行了）
   */
  let lastPlacedIndex = 0
  /** 新节点的 index */
  let newIdx = 0
  let nextOldFiber: FiberNode | null = null

  for (; oldFiber !== null && newIdx < nextChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      // 说明有节点被删除，这里需要判断是否可以插入
      nextOldFiber = oldFiber
      // oldFiber 置空，表示当前没有元素比较
      oldFiber = null
    } else {
      nextOldFiber = oldFiber.sibling
    }

    let newFiber = updateSlot(parentFiber, oldFiber, nextChildren[newIdx])

    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber
      }

      break
    }

    if (shouldTrackSideEffects) {
      if (oldFiber && newFiber.alternate === null) {
        // 有复用了已存在的节点，但 alternate 为 null 说明 newFiber 是新创建的
        // 需要把旧的删除
        deleteChild(parentFiber, oldFiber)
      }
    }

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)

    prevNewFiber.sibling = newFiber
    prevNewFiber = newFiber
    oldFiber = nextOldFiber
  }

  if (newIdx === nextChildren.length) {
    // 新 elements 都遍历完了，说明已经处理完需要处理的更新了，剩下的就节点可以删除了
    deleteAllChildren(parentFiber, oldFiber)
    return resultFirstChild.sibling
  }

  // 旧节点组中与新节点组中有 key 不同的节点
  if (oldFiber === null) {
    // 没有旧节点，说明可以直接对新的子元素做插入的处理
    for (; newIdx < nextChildren.length; newIdx++) {
      let newFiber = createChild(parentFiber, nextChildren[newIdx])
      if (newFiber) {
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        prevNewFiber.sibling = newFiber
        prevNewFiber = newFiber
      }
    }
  } else {
    let existingChildren = mapChildren(oldFiber)
    for (; newIdx < nextChildren.length; newIdx++) {
      let newFiber = updateFromMap(existingChildren, parentFiber, newIdx, nextChildren[newIdx])
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber !== null) {
            // 找到可复用的节点了，在 map 中删除掉
            existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key)
          }
        }

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)
        prevNewFiber.sibling = newFiber
        prevNewFiber = newFiber
      }
    }

    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => {
        deleteChild(parentFiber, child)
      })
    }
  }

  return resultFirstChild.sibling
}

const mapChildren = (fiber: FiberNode | null) => {
  let map = new Map<FiberNode['key'] | FiberNode['index'], FiberNode>()
  while (fiber !== null) {
    map.set(fiber.key || fiber.index, fiber)
    fiber = fiber.sibling
  }
  return map
}

const updateFromMap = (
  childrenMap: Map<any, FiberNode>,
  parentFiber: FiberNode,
  newIndex: number,
  newChild: MR.MRNode,
) => {
  if (typeof newChild === 'string' || typeof newChild === 'number') {
    let matchedFiber = childrenMap.get(newIndex) || null
    return updateTextNode(parentFiber, matchedFiber, '' + newChild)
  }

  if (typeof newChild === 'object' && newChild !== null) {
    let matchedFiber = childrenMap.get(newChild.key === null ? newIndex : newChild.key) || null
    return updateElement(parentFiber, matchedFiber, newChild)
  }
  return null
}

/**
 * 只在 key 以及 elementType 相同的情况下，返回可复用的节点
 */
const updateSlot = (
  parentFiber: FiberNode,
  oldFiber: FiberNode | null,
  newChild: MR.MRNode,
) => {
  // key 相同就更新节点(沿用原来节点或在 current 为 null 时创建节点)
  let key = oldFiber !== null ? oldFiber.key : null

  if (typeof newChild === 'string' || typeof newChild === 'number') {
    if (key !== null) {
      return null
    }

    return updateTextNode(parentFiber, oldFiber, '' + newChild)
  }

  // key 相同返回节点 / 不同就返回 null
  if (typeof newChild === 'object' && newChild !== null) {
    if (newChild.key === key) {
      return updateElement(parentFiber, oldFiber, newChild)
    } else {
      return null
    }
  }

  return null
}

const updateElement = (
  parentFiber: FiberNode,
  current: FiberNode | null,
  element: MR.MRElement,
) => {
  let workInProgress: FiberNode
  if (current !== null && current.elementType === element.type) {
    // 组件类型相同，可以使用原来的 fiber node
    workInProgress= useFiber(current, element.props)
  } else {
    // 重新创建一个
    workInProgress = createFiberFromElement(element)
  }
  workInProgress.return = parentFiber
  return workInProgress
}

const updateTextNode = (
  parentFiber: FiberNode,
  current: FiberNode | null,
  textContent: string,
) => {
  if (current === null || current.tag !== FiberTag.HostText) {
    // Insert
    let created = createFiberFromText(textContent)
    created.return = parentFiber
    return created
  } else {
    // Update
    let existing = useFiber(current, textContent)
    existing.return = parentFiber
    return existing
  }
}

const useFiber = (fiber: FiberNode, pendingProps: any) => {
  let newFiber = createWorkInProgress(fiber, pendingProps)
  newFiber.index = 0
  newFiber.sibling = null
  return newFiber
}

const deleteAllChildren = (parentFiber: FiberNode, currentChild: FiberNode | null) => {
  if (!shouldTrackSideEffects) {
    return null
  }

  while (currentChild !== null) {
    deleteChild(parentFiber, currentChild)
    currentChild = currentChild.sibling
  }
  return null
}

const deleteChild = (parentFiber: FiberNode, fiber: FiberNode) => {
  if (!shouldTrackSideEffects) {
    return
  }

  enqueueEffect(parentFiber, fiber)
  fiber.effectTag = EffectTag.Deletion
  fiber.nextEffect = null
}

const placeSingleChild = (fiber: FiberNode) => {
  if (shouldTrackSideEffects && fiber.alternate === null) {
    fiber.effectTag = EffectTag.Placement
  }

  return fiber
}


/**
 * 决定 newFiber 是否需要 place
 */
const placeChild = (newFiber: FiberNode, lastIndex: number, newIndex: number) => {
  newFiber.index = newIndex

  if (!shouldTrackSideEffects) {
    return lastIndex
  }

  let current = newFiber.alternate
  if (
    current === null || // 插入
    current.index < lastIndex // 当前旧节点的 index 小于记录到的最大的旧节点的 index，需要移动
  ) {
    newFiber.effectTag = EffectTag.Placement
    return lastIndex
  } else {
    // 使用原来的 index
    return current.index
  }
}

const createChild = (
  parentFiber: FiberNode,
  newChild: MR.MRNode,
) => {
  if (typeof newChild === 'string' || typeof newChild === 'number') {
    // 文本节点
    let newFiber = createFiberFromText('' + newChild)
    newFiber.return = parentFiber
    return newFiber
  }

  if (typeof newChild === 'object' && newChild !== null) {
    // element 节点
    let newFiber = createFiberFromElement(newChild)
    newFiber.return = parentFiber
    return newFiber
  }

  return null
}

export {
  reconcileChildren,
}
