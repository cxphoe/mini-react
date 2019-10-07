import { FiberNode } from './fiber'

const enqueueEffect = (fiber: FiberNode, effect: FiberNode) => {
  if (fiber.lastEffect === null) {
    fiber.firstEffect = fiber.lastEffect = effect
  } else {
    fiber.lastEffect.nextEffect = effect
    fiber.lastEffect = effect
  }
}

export {
  enqueueEffect,
}
