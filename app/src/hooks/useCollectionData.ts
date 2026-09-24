import { type Query, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'

interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

/** Live-subscribes to a Firestore query and returns its docs as a plain array. */
export function useCollectionData<T>(query: Query<T> | null): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ data: [], loading: true, error: null })

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null })
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    return onSnapshot(
      query,
      (snap) => {
        setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null })
      },
      (err) => {
        setState({ data: [], loading: false, error: err.message })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return state
}
