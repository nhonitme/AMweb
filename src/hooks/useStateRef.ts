import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"

export function useStateRef<T>(
  initialState: T | (() => T),
): readonly [T, Dispatch<SetStateAction<T>>, MutableRefObject<T>] {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)

  const setStateWithRef = useCallback<Dispatch<SetStateAction<T>>>((value) => {
    setState((current) => {
      const next = typeof value === "function" ? (value as (current: T) => T)(current) : value
      stateRef.current = next
      return next
    })
  }, [])

  return [state, setStateWithRef, stateRef] as const
}

export default useStateRef
