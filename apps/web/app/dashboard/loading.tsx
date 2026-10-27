'use client'

import { useEffect, useState } from 'react'
import { WAKING_DELAY_MS, WAKING_MESSAGE } from '@/utils/api'

/**
 * Suspense fallback for the dashboard. The dashboard's server component fetches
 * from the API, which can cold-start on first load. After 5 seconds we upgrade
 * the generic "Loading..." text to the waking message so users know what is
 * happening while the server-rendered request is still pending.
 */
export default function Loading() {
  const [waking, setWaking] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setWaking(true), WAKING_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        {waking ? (
          <p className="text-gray-600" data-testid="waking-message">
            {WAKING_MESSAGE}
          </p>
        ) : (
          <p className="text-gray-600">Loading...</p>
        )}
      </div>
    </div>
  )
}
