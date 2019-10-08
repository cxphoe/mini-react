import { updateContainer } from '../MRFiber/container'

const validChildren = (children: any) => {
  return !(children === undefined || children === null || typeof children === 'boolean')
}

// component
function Element(
  type: MR.HTMLTags,
  props: MR.HTMLElementProps,
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
  }

  children = children.filter(validChildren)
  if (children.length > 0) {
    if (props === null || props === undefined) {
      props = { children }
    } else {
      props.children = children
    }
  }

  let result = {
    key,
    type,
    props,
  }
  return result
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
