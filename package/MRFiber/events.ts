import { FiberNode } from './fiber'
import { findHostParent, getInstanceProps, getInternalInstance } from './host'
import { executionContext, updateContext, EventContext, isIdleContext } from './executionContext'
import { flushSyncCallbackQueue } from '../MRScheduler'

const normalizeKey = {
  Esc: 'Escape',
  Spacebar: ' ',
  Left: 'ArrowLeft',
  Up: 'ArrowUp',
  Right: 'ArrowRight',
  Down: 'ArrowDown',
  Del: 'Delete',
  Win: 'OS',
  Menu: 'ContextMenu',
  Apps: 'ContextMenu',
  Scroll: 'ScrollLock',
  MozPrintableKey: 'Unidentified',
}

const translateToKey = {
  '8': 'Backspace',
  '9': 'Tab',
  '12': 'Clear',
  '13': 'Enter',
  '16': 'Shift',
  '17': 'Control',
  '18': 'Alt',
  '19': 'Pause',
  '20': 'CapsLock',
  '27': 'Escape',
  '32': ' ',
  '33': 'PageUp',
  '34': 'PageDown',
  '35': 'End',
  '36': 'Home',
  '37': 'ArrowLeft',
  '38': 'ArrowUp',
  '39': 'ArrowRight',
  '40': 'ArrowDown',
  '45': 'Insert',
  '46': 'Delete',
  '112': 'F1',
  '113': 'F2',
  '114': 'F3',
  '115': 'F4',
  '116': 'F5',
  '117': 'F6',
  '118': 'F7',
  '119': 'F8',
  '120': 'F9',
  '121': 'F10',
  '122': 'F11',
  '123': 'F12',
  '144': 'NumLock',
  '145': 'ScrollLock',
  '224': 'Meta',
}

const registrationNameModules: {
  [key: string]: ReturnType<typeof getEventConfig>
} = {}
const registrationNameDependencies: {
  [key: string]: string[]
} = {}

const eventConfigs: {
  [key: string]: ReturnType<typeof getEventConfig>
} = {}

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8
const DOCUMENT_NODE = 9
const DOCUMENT_FRAGMENT_NODE = 11

class SyntheticEvent {
  dispatchConfig: ReturnType<typeof getEventConfig>
  targetInst: FiberNode
  nativeEvent: Event
  _dispatchListeners: MR.EventHandler[]
  _dispatchInstances: FiberNode[]

  static extend(attributes: {[key: string]: any}) {
    let ExtendedSyntheticEvent = class extends this {
      getAttributes() {
        return {
          ...super.getAttributes(),
          ...attributes,
        }
      }
    }
    return ExtendedSyntheticEvent
  }

  constructor(
    dispatchConfig: ReturnType<typeof getEventConfig>,
    targetInst: FiberNode,
    nativeEvent: Event,
    nativeEventTarget: any,
  ) {
    this.dispatchConfig = dispatchConfig
    this.targetInst = targetInst
    this.nativeEvent = nativeEvent
    this._dispatchInstances = []
    this._dispatchListeners = []
    let attributes = this.getAttributes()
    let self: any = this
    for (let key of Object.keys(attributes)) {
      delete self[key]
      let normalize = attributes[key]

      if (normalize) {
        self[key] = normalize(nativeEvent)
      } else {
        if (key === 'target') {
          self.target = nativeEventTarget
        } else {
          self[key] = (nativeEvent as any)[key]
        }
      }
    }
  }

  getAttributes(): any {
    return {
      type: null,
      target: null,
      // currentTarget is set when dispatching; no use in copying it here
      currentTarget: function () {
        return null
      },
      eventPhase: null,
      bubbles: null,
      cancelable: null,
      timeStamp: (event: Event) => {
        return event.timeStamp || Date.now()
      },
      defaultPrevented: null,
      isTrusted: null,
    }
  }
}

const getEventKey = (nativeEvent: KeyboardEvent) => {
  if (nativeEvent.key) {
    let key = (normalizeKey as any)[nativeEvent.key] || nativeEvent.key

    if (key !== 'Unidentified') {
      return key
    }
  }


  if (nativeEvent.type === 'keypress') {
    let charCode = getEventCharCode(nativeEvent)

    return charCode === 13 ? 'Enter' : String.fromCharCode(charCode)
  }

  if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
    return (translateToKey as any)[nativeEvent.keyCode] || 'Unidentified'
  }

  return ''
}

function getEventCharCode(nativeEvent: KeyboardEvent) {
  let charCode
  let keyCode = nativeEvent.keyCode

  if ('charCode' in nativeEvent) {
    charCode = nativeEvent.charCode

    if (charCode === 0 && keyCode === 13) {
      charCode = 13
    }
  } else {
    charCode = keyCode
  }

  if (charCode === 10) {
    charCode = 13
  }

  if (charCode >= 32 || charCode === 13) {
    return charCode
  }

  return 0
}

const SyntheticKeyboardEvent = SyntheticEvent.extend({
  key: getEventKey,
  location: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  repeat: null,
  locale: null,
  // getModifierState: getEventModifierState,
  charCode: (event: KeyboardEvent) => {
    if (event.type === 'keypress') {
      return getEventCharCode(event)
    }

    return 0
  },
  keyCode: (event: KeyboardEvent) => {
    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode
    }

    return 0
  },
  which: (event: KeyboardEvent) => {
    if (event.type === 'keypress') {
      return getEventCharCode(event)
    }

    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode
    }

    return 0
  },
})

let previousScreenX = 0
let previousScreenY = 0

let isMovementXSet = false
let isMovementYSet = false

const SyntheticMouseEvent = SyntheticEvent.extend({
  screenX: null,
  screenY: null,
  clientX: null,
  clientY: null,
  pageX: null,
  pageY: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  // getModifierState: getEventModifierState,
  button: null,
  buttons: null,
  relatedTarget: (event: any) => {
    return event.relatedTarget || (event.fromElement === event.srcElement ? event.toElement : event.fromElement)
  },
  movementX: (event: any) => {
    if ('movementX' in event) {
      return event.movementX
    }

    let screenX = previousScreenX
    previousScreenX = event.screenX

    if (!isMovementXSet) {
      isMovementXSet = true
      return 0
    }

    return event.type === 'mousemove' ? event.screenX - screenX : 0
  },
  movementY: (event: any) => {
    if ('movementY' in event) {
      return event.movementY
    }

    let screenY = previousScreenY
    previousScreenY = event.screenY

    if (!isMovementYSet) {
      isMovementYSet = true
      return 0
    }

    return event.type === 'mousemove' ? event.screenY - screenY : 0
  },
})

const capitialize = (str: string) => {
  return str[0].toUpperCase() + str.slice(1)
}

const getEventConfig = (eventName: string, EventCtor: typeof SyntheticEvent) => {
  let eventHandle = 'on' + capitialize(eventName)
  return {
    ctor: EventCtor,
    phaseNames: {
      bubbled: eventHandle,
      captured: eventHandle + 'Capture',
    },
    dependencies: [eventName],
  }
}


let events: [string, typeof SyntheticEvent][] = [
  ['click', SyntheticEvent],
  ['input', SyntheticEvent],
  ['keyDown', SyntheticKeyboardEvent],
  ['keyUp', SyntheticKeyboardEvent],
  ['keyPress', SyntheticKeyboardEvent],
  ['mouseOver', SyntheticMouseEvent],
  ['mouseOut', SyntheticMouseEvent],
]

for (let [eventName, EventCtor] of events) {
  let config = getEventConfig(eventName, EventCtor)
  eventConfigs[eventName] = config
  for (let phaseName of Object.values(config.phaseNames)) {
    registrationNameDependencies[phaseName] = config.dependencies
    registrationNameModules[phaseName] = config
  }
}

const listeningSet = new Set<string>()
const ensureListeningTo = (phaseEventName: string) => {
  let doc = document
  let dependencies = registrationNameDependencies[phaseEventName]
  for (let dep of dependencies) {
    if (!listeningSet.has(dep)) {
      trapBubbledEvent(dep, doc)
      // 每次监听之后都把监听的事件记录下来，保证只注册一次事件监听
      listeningSet.add(dep)
    }
  }
}

const trapBubbledEvent = (handleType: string, element: Document) => {
  trapEventForPluginEventSystem(element, handleType, false)
}

const trapCapturedEvent = (handleType: string, element: Document) => {
  trapEventForPluginEventSystem(element, handleType, true)
}

const trapEventForPluginEventSystem = (
  element: Document,
  handleType: string,
  capture: boolean,
) => {
  let listener = batchDispatchEvent.bind(null, handleType)
  element.addEventListener(handleType.toLowerCase(), listener, capture)
}

const batchDispatchEvent = (handleType: string, nativeEvent: Event) => {
  let prevContext = executionContext
  updateContext(EventContext)
  dispatchEvent(handleType, nativeEvent)
  updateContext(prevContext)
  if (isIdleContext()) {
    flushSyncCallbackQueue()
  }
}

const dispatchEvent = (handleType: string, nativeEvent: Event) => {
  let target = getEventTarget(nativeEvent)
  let targetInst = getInternalInstance(target)
  let dispatchConfig = eventConfigs[handleType]
  let EventCtor = dispatchConfig.ctor
  let event = new EventCtor(dispatchConfig, targetInst, nativeEvent, target)
  traverseTwoPhase(targetInst, event)

  let {
    _dispatchInstances: instances,
    _dispatchListeners: listeners,
  } = event
  for (let i = 0; i < listeners.length; i++) {
    let listener = listeners[i]
    let inst = instances[i]

    ;(event as any).currentTarget = inst.stateNode
    try {
      listener(event)
    } catch (error) {
      console.trace(error)
    }
    ;(event as any).currentTarget = null
  }
}

const getEventTarget = (nativeEvent: Event) => {
  let target = (nativeEvent.target || nativeEvent.srcElement || window) as HTMLElement

  if ((target as any).correspondingUseElement) {
    target = (target as any).correspondingUseElement
  }

  return (target.nodeType === TEXT_NODE ? target.parentNode : target) as HTMLElement
}

const traverseTwoPhase = (inst: FiberNode, event: SyntheticEvent) => {
  let path = []
  let parent: FiberNode | null = inst
  while (parent) {
    path.push(parent)
    try {
      parent = findHostParent(parent)
    } catch {
      parent = null
    }
  }

  let {
    bubbled,
    captured,
  } = event.dispatchConfig.phaseNames

  for (let i = path.length - 1; i >= 0; i--) {
    let node = path[i]
    let listener = getListener(node, captured)
    if (listener) {
      event._dispatchListeners.push(listener)
      event._dispatchInstances.push(node)
    }
  }

  for (let i = path.length - 1; i >= 0; i--) {
    let node = path[i]
    let listener = getListener(node, bubbled)
    if (listener) {
      event._dispatchListeners.push(listener)
      event._dispatchInstances.push(node)
    }
  }
}

const isInteractive = (tag: MR.HTMLTags) => {
  return tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea'
}

const shouldPreventMouseEvent = (name: string, type: MR.HTMLTags, props: MR.HTMLElementProps) => {
  switch (name) {
    case 'onClick':
    case 'onClickCapture':
    case 'onDoubleClick':
    case 'onDoubleClickCapture':
    case 'onMouseDown':
    case 'onMouseDownCapture':
    case 'onMouseMove':
    case 'onMouseMoveCapture':
    case 'onMouseUp':
    case 'onMouseUpCapture':
      return !!(props.disabled && isInteractive(type))

    default:
      return false
  }
}

const getListener = (inst: FiberNode, registrationName: string) => {
  let listener
  let stateNode = inst.stateNode

  if (!stateNode) {
    // Work in progress (ex: onload events in incremental mode).
    return null
  }

  let props = getInstanceProps(stateNode) as any

  if (!props) {
    // Work in progress.
    return null
  }

  listener = props[registrationName]

  if (shouldPreventMouseEvent(registrationName, inst.elementType as MR.HTMLTags, props)) {
    return null
  }

  return listener
}

export {
  registrationNameModules,
  registrationNameDependencies,
  ensureListeningTo,
}
