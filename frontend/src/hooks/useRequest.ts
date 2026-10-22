import { useCallback, useEffect, useEffectEvent, useState } from 'react'

import { ApiError } from '../api/client'

export interface RequestState<T> {
  data: T | null
  error: string | null
  /**
   * The error as it was thrown. `error` holds the message that is shown to
   * the reader; this keeps the status code for callers that have to tell one
   * failure from another.
   */
  failure: unknown
  isLoading: boolean
  /** Runs the request again without changing the key. */
  reload: () => void
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Loads data whenever `key` changes and can be re-run on demand.
 *
 * The key has to describe every input the loader depends on — the status
 * filter and the page number, for example. The loader itself is read through
 * an effect event, so it always sees the newest closure without becoming an
 * effect dependency.
 */
export function useRequest<T>(key: string, loader: () => Promise<T>): RequestState<T> {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<{
    key: string
    data: T | null
    error: string | null
    failure: unknown
  } | null>(null)

  const requestKey = `${key}::${reloadToken}`

  const runLoader = useEffectEvent(async () => loader())

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const data = await runLoader()
        if (!cancelled) {
          setState({ key: requestKey, data, error: null, failure: null })
        }
      } catch (caught) {
        if (!cancelled) {
          setState({
            key: requestKey,
            data: null,
            error: caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE,
            failure: caught,
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  // A response for an older key is stale and must not be shown.
  const isStale = state === null || state.key !== requestKey

  return {
    data: isStale ? null : state.data,
    error: isStale ? null : state.error,
    failure: isStale ? null : state.failure,
    isLoading: isStale,
    reload,
  }
}
