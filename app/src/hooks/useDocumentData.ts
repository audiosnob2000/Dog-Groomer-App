import { type DocumentReference, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'

interface DocumentState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Live-subscribes to a single Firestore document. */
export function useDocumentData<T>(ref: DocumentReference<T> | null): DocumentState<T> {
  const [state, setState] = useState<DocumentState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    return onSnapshot(
      ref,
      (snap) => {
        setState({ data: snap.exists() ? snap.data() : null, loading: false, error: null })
      },
      (err) => {
        setState({ data: null, loading: false, error: err.message })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return state
}
