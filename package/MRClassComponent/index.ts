import { scheduleWork, Sync } from '../MRScheduler'
import { enqueueUpdate, createUpdate } from '../MRFiber'
import { getInstance } from '../MRFiber/classComponent'

const classComponentUpdater = {
  enqueueSetState: function (inst: MR.Component, payload: any, callback?: null | (() => void)) {
    let fiber = getInstance(inst)
    let update = createUpdate()
    update.payload = payload

    if (callback !== undefined && callback !== null) {
      update.callback = callback
    }

    enqueueUpdate(fiber, update)
    scheduleWork(fiber, Sync)
  },
}

class Component<P = {}, S = {}> implements MR.Component<P, S> {
  static isClassComponent = true
  static contextType?: any;

  context: any;
  readonly props: Readonly<P> & Readonly<{ children?: any }>;
  state: Readonly<S> = {} as any;

  constructor(props: Readonly<P>) {
    this.props = props
  }

  // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
  // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
  // Also, the ` | S` allows intellisense to not be dumbisense
  setState<K extends keyof S>(
    state:
      | ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null)
      | (Pick<S, K> | S | null),
    callback?: () => void
  ) {
    classComponentUpdater.enqueueSetState(this, state, callback)
  }

  forceUpdate(callback?: () => void) {


  }

  render() {
    return null
  }
}

export {
  Component,
}
