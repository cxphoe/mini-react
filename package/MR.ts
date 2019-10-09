import {
  CurrentDispatcher,
} from './MRFiber/hook'


/** use Function implementation */
const useState = <S>(initialState: S | (() => S)) => {
  return CurrentDispatcher.current!.useState(initialState)
}

const useReducer = <S, A>(reducer: MR.HookReducer<S, A>, initialState: S) => {
  return CurrentDispatcher.current!.useReducer(reducer, initialState)
}

export {
  useState,
  useReducer,
}
