export const NoContext = 0
export const EventContext = 1

export let executionContext: number = NoContext

export function isIdleContext() {
  return executionContext === NoContext
}

export function updateContext(tag: number) {
  executionContext = tag
}
