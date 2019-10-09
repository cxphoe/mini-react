import { FiberNode } from './fiber'

export const FiberTag = {
  ClassComponent: 0,
  FunctionComponent: 1,
  HostRoot: 2,
  HostComponent: 3,
  HostText: 4,
}

export const EffectTag = {
  NoEffect:             0b00000000,
  PerformedWork:        0b00000001,
  Update:               0b00000010,
  Placement:            0b00000100,
  Deletion:             0b00001000,
  Callback:             0b00010000,
  ContentReset:         0b00100000,
  PlacementAndUpdate:   0b00000110,
  Snapshot:             0b01000000,
  Passive:              0b10000000,
}

export const UpdateTag = {
  Base: 0,
  Replace: 1,
}

const markPerformedWork = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.PerformedWork
}

const markUpdate = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.Update
}

const markPlacement = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.Placement
}

const markDeletion = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.Deletion
}

const markCallback = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.Callback
}

const markContentReset = (fiber: FiberNode) => {
  fiber.effectTag |= EffectTag.ContentReset
}

export {
  markPerformedWork,
  markUpdate,
  markPlacement,
  markDeletion,
  markCallback,
  markContentReset,
}
