import { FiberNode } from './fiber'
import { markUpdate, markContentReset, FiberTag, EffectTag } from './tag'
import { registrationNameModules } from './events'
import { reconcileChildren } from './reconcile'
import { FiberRootNode } from './fiberRoot'
import { removeChildFromContainer, removeChild } from './dom'
import { commitUnmount } from './commit'

const STYLE = 'style'
const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML'
const CHILDREN = 'children'

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8
const DOCUMENT_NODE = 9
const DOCUMENT_FRAGMENT_NODE = 11

function shouldSetTextContent(type: MR.HTMLTags, props: any) {
  return type === 'textarea' ||
    type === 'option' ||
    type === 'noscript' ||
    typeof props.children === 'string' ||
    typeof props.children === 'number' ||
    typeof props[DANGEROUSLY_SET_INNER_HTML] === 'object' &&
    props[DANGEROUSLY_SET_INNER_HTML] !== null &&
    props[DANGEROUSLY_SET_INNER_HTML].__html != null
}

function shouldAutoFocusHostComponent(type: MR.HTMLTags, props: any) {
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus
  }
  return false
}

const updateHostComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
) => {
  let type = workInProgress.elementType as MR.HTMLTags
  let nextProps = workInProgress.pendingProps
  let prevProps = current === null ? null : current.memoizedProps
  let nextChildren = nextProps.children

  if (shouldSetTextContent(type, nextProps)) {
    // 如果不是节点类型的，只是文本，在 complete 的阶段会做处理
    // 这里不用处理
    nextChildren = null
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // 这里需要在 commit 做额外处理：将原来的文本内容做替换的处理
    markContentReset(workInProgress)
  }

  reconcileChildren(current, workInProgress, nextChildren)
  return workInProgress.child
}

const completeHostComponent = (
  current: FiberNode | null,
  workInProgress: FiberNode,
  type: MR.HTMLTags,
  newProps: any,
) => {
  if (current !== null && workInProgress.stateNode !== null) {
    let oldProps = current.memoizedProps

    // Host 组件只会依赖 props 变动来更新，所以旧的 props 与新的 props 相等时
    // 不用做任何操作
    if (oldProps === newProps) {
      return
    }

    let instance = workInProgress.stateNode as HTMLElement
    let updatePayload = prepareUpdate(instance, type, oldProps, newProps)
    workInProgress.updateQueue = updatePayload

    if (updatePayload) {
      markUpdate(workInProgress)
    }
  } else {
    if (!newProps) {
      // 如果没有 props，就不用没有必要更新到页面
      return
    }

    // 创建新的 dom 实例，初始化 attributes 以及将所有子元素添加好
    // 这里的 instance 还没有添加到页面中，这里的 dom 操作不会导致页面重绘/回流
    let instance = createDomInstance(type as MR.HTMLTags, newProps, workInProgress)
    appendAllChildren(instance, workInProgress)
    setInitialProperties(instance, type as MR.HTMLTags, newProps)

    workInProgress.stateNode = instance
  }
}

/**
 * 找出 workInProgress 中属于 container 元素子元素的节点，把它们的 dom
 * 实例都添加到 container 中
 */
const appendAllChildren = (
  container: HTMLElement,
  workInProgress: FiberNode,
) => {
  let child = workInProgress.child

  while (child !== null) {
    if (
      child.tag === FiberTag.HostComponent ||
      child.tag === FiberTag.HostText
    ) {
      container.appendChild(child.stateNode)
    } else if (child.child !== null) {
      child.child.return = child
      child = child.child
      continue
    }

    if (child === workInProgress) {
      return
    }

    while (child.sibling === null) {
      if (child.return === null || child.return === workInProgress) {
        return
      }
      child = child.return
    }

    child.sibling.return = child.return
    child = child.sibling
  }
}

const initializeInstance = (
  domElement: HTMLElement,
  tag: MR.HTMLTags,
  props: any,
) => {
  setInitialProperties(domElement, tag, props)
  return shouldAutoFocusHostComponent(tag, props)
}

const isHost = (node: FiberNode) => {
  return node.tag === FiberTag.HostComponent || node.tag === FiberTag.HostRoot
}

const findHostParent = (node: FiberNode) => {
  let parent = node.return

  do {
    if (parent === null) {
      throw new Error('Expect find a host parent.')
    }
    if (isHost(parent)) {
      return parent
    }
    parent = parent.return
  } while (true)
}

/**
 * 找到 fiber 中第一个 host fiber
 * @param fiber
 * @param placed 表示是否只限定寻找已经添加到页面中的节点
 */
const findFirstHost = (fiber: FiberNode, placed?: boolean) => {
  let node: FiberNode = fiber
  do {
    // 检查当前节点是否可作为有效的 host 节点
    //   1. placed 为假值，说明不限制 host 是否已经放置到页面，只要是 host 类型都是游戏的
    //   2. placed 为真值，说明只有元素是为未标记“放置”或者没有 alternate 元素(说明当前
    //      元素是新创建的)，才是有效的
    let valid = !placed ||
      ((node.effectTag & EffectTag.Placement) === EffectTag.NoEffect &&
      node.alternate !== null)
    if (
      isHost(node) && valid
      // 如果只限定已经存在于页面的节点,当前节点未放到页面，
      // 那它的子节点也必定是未放置到页面中的，这里不用再迭代寻找
    ) {
      return node
    } else if (
      node.child && valid

    ) {
      node = node.child
    } else {
      while (node.sibling === null) {
        if (node.return === null || node.return === fiber) {
          return null
        }
        node = node.return
      }
      node = node.sibling
    }
  } while (true)
}

const findHostSibling = (fiber: FiberNode) => {
  while (true) {
    let sibling = fiber.sibling
    while (sibling) {
      let result = findFirstHost(sibling, true)
      if (result) {
        return result
      }
      sibling = sibling.sibling
    }

    if (fiber.return === null || isHost(fiber.return)) {
      return null
    }
    fiber = fiber.return
  }
}

const unmountHostComponent = (fiber: FiberNode) => {
  let parent = findHostParent(fiber)
  let inContainer = parent.stateNode instanceof FiberRootNode
  // let element = fiber.stateNode
  let parentElement = inContainer
    ? (parent.stateNode as FiberRootNode).container
    : (parent.stateNode as HTMLElement)

  let node: FiberNode | null = fiber
  let firstHost: FiberNode | null = null
  while (node) {
    if (
      node.tag === FiberTag.HostComponent ||
      node.tag === FiberTag.HostText
    ) {
      if (firstHost) {
        continue
      }
      firstHost = node
      if (inContainer) {
        removeChildFromContainer(parentElement, node.stateNode)
      } else {
        removeChild(parentElement, node.stateNode)
      }
    } else {
      commitUnmount(node)
    }

    if (node.child) {
      node = node.child
    } else if (node === fiber) {
      return
    } else {
      while (node.sibling === null) {
        if (node.return === null || node.return === fiber) {
          return
        }
        node = node.return
      }
      node = node.sibling
    }
  }
}

const prepareUpdate = (inst: HTMLElement, type: MR.HTMLTags, oldProps: any, newProps: any) => {
  return diffProperties(inst, type, oldProps, newProps)
}

const diffProperties = (domElement: HTMLElement, type: MR.HTMLTags, oldProps: any, newProps: any) => {
  let styleUpdates: any = null
  let updatePayload = []

  // 检查在 newProps 中不存在的键
  for (let key of Object.keys(oldProps)) {
    if (newProps.hasOwnProperty(key) || oldProps[key] === null) {
      continue
    }

    if (key === STYLE) {
      let oldStyle = oldProps[key]
      for (let styleName of Object.keys(oldStyle)) {
        if (!styleUpdates) {
          styleUpdates = {}
        }
        styleUpdates[styleName] = ''
      }
    } else if (key === DANGEROUSLY_SET_INNER_HTML) {
      updatePayload.push('innerHTML', '')
    } else if (registrationNameModules[key]) {
    } else {
      updatePayload.push(key, null)
    }
  }

  for (let key of Object.keys(newProps)) {
    let newProp = newProps[key]
    let oldProp = oldProps === null ? undefined : oldProps[key]

    if (newProp === oldProp) {
      continue
    }

    if (key === STYLE) {
      if (oldProp) {
        // 重置在旧 props 中存在，而在新 props 中不存在的样式
        for (let styleName of Object.keys(oldProp)) {
          if (!newProp || !newProp[styleName]) {
            if (!styleUpdates) {
              styleUpdates = {}
            }

            styleUpdates[styleName] = ''
          }
        }

        // 更新新 style 中与旧 style 不一样的样式
        for (let styleName of Object.keys(newProp)) {
          if (oldProp[styleName] !== newProp[styleName]) {
            if (!styleUpdates) {
              styleUpdates = {}
            }

            styleUpdates[styleName] = newProp[styleName]
          }
        }
      } else {
        if (!styleUpdates) {
          updatePayload.push(STYLE, null)
        }
        styleUpdates = null
      }
    } else if (key === DANGEROUSLY_SET_INNER_HTML) {
      let nextHtml = newProp ? newProp.__html : undefined
      let lastHtml = oldProp ? oldProp.__html : undefined
      if (nextHtml !== null && nextHtml !== lastHtml) {
        updatePayload.push('innerHTML', '' + nextHtml)
      }
    } else if (key === CHILDREN) {
      if (oldProp !== newProp && (typeof newProp === 'number' || typeof newProp === 'string')) {
        updatePayload.push(CHILDREN, '' + newProp)
      }
    } else if (registrationNameModules[key]) {
      // TODO: 事件处理
    } else {
      updatePayload.push(key, newProp)
    }
  }

  if (styleUpdates) {
    updatePayload.push(STYLE, styleUpdates)
  }

  return updatePayload.length > 0 ? updatePayload : null
}


//// commit

const internalEventHandlersKey = '__mr_event_handlers_key'
const internalInstanceKey = '__mr_instance_key'

const setInternalInstance = (domElement: HTMLElement | Text, fiber: FiberNode): void => {
  (domElement as any)[internalInstanceKey] = fiber
}

const getInternalInstance = (domElement: HTMLElement | Text): FiberNode => {
  return (domElement as any)[internalInstanceKey]
}

const updateInstanceProps = (domElement: HTMLElement, props: any): void => {
  (domElement as any)[internalEventHandlersKey] = props
}

const getInstanceProps = (domElement: HTMLElement): FiberNode => {
  return (domElement as any)[internalEventHandlersKey]
}

const commitUpdate = (
  domElement: HTMLElement,
  updatePayload: any[],
  type: MR.HTMLTags,
  oldProps: any,
  newProps: any,
) => {
  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  updateInstanceProps(domElement, newProps)
  updateProperties(domElement, updatePayload, type, oldProps, newProps)
}

const updateProperties = (
  domElement: HTMLElement,
  updatePayload: any[],
  type: MR.HTMLTags,
  oldProps: any,
  newProp: any,
) => {
  updateDOMProperties(domElement, updatePayload)
}

const setInitialProperties = (
  domElement: HTMLElement,
  tag: MR.HTMLTags,
  rawProps: any,
) => {
  setInitialDomProperties(domElement, tag, rawProps)
}

const setInitialDomProperties = (
  domElement: HTMLElement,
  tag: MR.HTMLTags,
  props: any,
) => {
  for (let key of Object.keys(props)) {
    let prop = props[key]
    if (key === STYLE) {
      setValueForStyles(domElement, prop)
    } else if (key === DANGEROUSLY_SET_INNER_HTML) {
      let html = prop ? props.__html : undefined
      domElement.innerHTML = html || ''
    } else if (key === CHILDREN) {
      if (typeof prop === 'string' || typeof prop === 'number') {
        setTextContent(domElement, '' + prop)
      }
    } else {
      domElement.setAttribute(key, prop)
    }
  }
}

const updateDOMProperties = (domElement: HTMLElement, updatePayload: any[]) => {
  for (let i = 0; i < updatePayload.length; i += 2) {
    let propKey = updatePayload[i]
    let propValue = updatePayload[i + 1]

    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      domElement.innerHTML = propValue
    } else if (propKey === CHILDREN) {
      setTextContent(domElement, propValue)
    } else {
      domElement.setAttribute(propKey, propValue)
    }
  }
}

const setValueForStyles = (node: HTMLElement, styles: any) => {
  let style = node.style

  for (let styleName of Object.keys(styles)) {
    let styleValue = styles[styleName]
    if (styleName === 'float') {
      styleName = 'cssFloat'
    }

    style[styleName as any] = styleValue
  }
}

const setTextContent = (node: HTMLElement, text: string) => {
  if (text) {
    let firstChild = node.firstChild

    if (firstChild && firstChild === node.lastChild && firstChild.nodeType === TEXT_NODE) {
      firstChild.nodeValue = text
      return
    }
  }

  node.textContent = text
}

const createDomInstance = (type: MR.HTMLTags, props: any, internalInstance: FiberNode) => {
  let domElement = document.createElement(type)
  updateInstanceProps(domElement, props)
  setInternalInstance(domElement, internalInstance)
  return domElement
}

const createTextInstance = (text: string | number, internalInstance: FiberNode) => {
  let textNode = document.createTextNode('' + text)
  setInternalInstance(textNode, internalInstance)
  return textNode
}

export {
  updateHostComponent,
  completeHostComponent,
  unmountHostComponent,
  commitUpdate,
  setInternalInstance,
  getInternalInstance,
  getInstanceProps,
  updateInstanceProps,
  createDomInstance,
  createTextInstance,
  setTextContent,
  findHostParent,
  findHostSibling,
  findFirstHost,
}
