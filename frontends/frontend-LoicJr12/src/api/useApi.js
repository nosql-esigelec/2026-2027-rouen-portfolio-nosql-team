// Petit hook générique : { data, error, loading } pour n'importe quel appel API
import { useEffect, useState } from 'react'

export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
