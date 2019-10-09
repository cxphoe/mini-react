import { updateContainer } from '../MRFiber/container'

const validChildren = (children: any) => {
  return !(children === undefined || children === null || typeof children === 'boolean')
}

const render = (
  element: MR.MRElement,
  container: HTMLElement,
  callback?: () => void,
) => {
  updateContainer(container, element, callback)
}

// component
function Element(
  type: MR.HTMLTags,
  props: MR.HTMLElementProps | null,
  ...children: MR.MRNode[]
): MR.MRElement
function Element<P>(
  type: MR.ComponentClass<P> | MR.FunctionComponent<P>,
  props: { key?: string | number } & P | null,
  ...children: MR.MRNode[]
): MR.MRElement
function Element<P, T extends MR.HTMLTags | MR.FunctionComponent<P> | MR.ComponentClass<P>>(
  type: T,
  props: any,
  ...children: MR.MRNode[]
): MR.MRElement {

  let key = null
  if (props !== null) {
    props = { ...props }
    if (props.key !== undefined) {
      key = props.key
    }
    delete props.key
  }

  children = children.filter(validChildren)
  if (children.length > 0) {
    let _children: any = children.length === 1 ? children[0] : children
    if (props === null || props === undefined) {
      props = { children: _children }
    } else {
      props.children = _children
    }
  }

  let result = {
    key,
    type,
    props,
  }
  return result
}

export {
  Element,
  render,
}
