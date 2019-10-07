const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8
const DOCUMENT_NODE = 9
const DOCUMENT_FRAGMENT_NODE = 1

const appendChild = (parentInstance: HTMLElement, child: any) => {
  parentInstance.appendChild(child)
}

const appendChildToContainer = (container: HTMLElement, child: any) => {
  let parentNode

  if (container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode as HTMLElement
    parentNode.insertBefore(child, container)
  } else {
    parentNode = container
    parentNode.appendChild(child)
  }
}

const insertBefore = (parentInstance: HTMLElement, child: any, beforeChild: any) => {
  parentInstance.insertBefore(child, beforeChild)
}

const insertInContainerBefore = (container: HTMLElement, child: any, beforeChild: any) => {
  if (container.nodeType === COMMENT_NODE) {
    (container.parentNode as HTMLElement).insertBefore(child, beforeChild)
  } else {
    container.insertBefore(child, beforeChild)
  }
}

const removeChild = (parentInstance: HTMLElement, child: any) => {
  parentInstance.removeChild(child)
}

const removeChildFromContainer = (container: HTMLElement, child: any) => {
  if (container.nodeType === COMMENT_NODE) {
    (container.parentNode as any).removeChild(child)
  } else {
    container.removeChild(child)
  }
}

export {
  appendChild,
  appendChildToContainer,
  insertBefore,
  insertInContainerBefore,
  removeChild,
  removeChildFromContainer,
}
