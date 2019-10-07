import { updateContainer } from '../MRFiber/container'

const validChildren = (children: any) => {
  return !(children === undefined || children === null || typeof children === 'boolean')
}

const Element = <P, T extends MR.HTMLTags | MR.FunctionComponent<P> | MR.ComponentClass<P>>(
  type: T,
  props: T extends MR.HTMLTags ? MR.HTMLElementProps : P,
  children: MR.MRNode | MR.MRNode[],
): MR.MRElement => {
  let key = (props as any).key
  if (key === undefined) {
    key = null
  }
  if (Array.isArray(children)) {
    children = children.filter(validChildren)
    if (children.length === 0) {
      children = undefined
    }
  }
  if (validChildren(children)) {
    props = {
      ...props,
      children,
    }
  }

  return {
    key,
    type,
    props: {
      ...props,
    },
  }
}

const render = (
  element: MR.MRElement,
  container: HTMLElement,
  callback?: () => void,
) => {
  updateContainer(container, element, callback)
}

export {
  Element,
  render,
}
