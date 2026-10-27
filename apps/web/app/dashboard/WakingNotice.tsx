'use client'

import { WAKING_MESSAGE } from '@/utils/api'

/**
 * Inline notice shown while a client-side API call is still pending after the
 * 5s cold-start threshold (fetchApi's onWaking fired).
 */
export default function WakingNotice() {
  return (
    <div
      data-testid="waking-message"
      className="rs-form-info"
      style={{ margin: '12px 0', color: 'var(--text-secondary, #6b7280)' }}
      role="status"
    >
      {WAKING_MESSAGE}
    </div>
  )
}
