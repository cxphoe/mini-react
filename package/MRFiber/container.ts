import { createFiberRoot } from './fiberRoot'
import { createUpdate, enqueueUpdate } from './updateQueue'
import { scheduleWork, Sync } from '../MRScheduler'

const updateContainer = (
  container: HTMLElement,
  element: MR.MRElement,
  callback?: () => void,
) => {
  let root = createFiberRoot(container)
  let current = root.current

  let update = createUpdate()
  update.payload = {
    element,
  }
  update.callback = callback || null

  enqueueUpdate(current, update)
  scheduleWork(current, Sync)
}

export {
  updateContainer,
}
