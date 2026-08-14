"use client"

import { useState } from 'react'
import { fetchApi } from '@/utils/api'

type DocumentItem = {
  id: string
  name: string
  mimeType?: string | null
  sizeBytes?: number | null
  createdAt: string
  storageKey?: string
}

export default function DocumentActions({ doc, token }: { doc: DocumentItem; token: string }) {
  const [isOpening, setIsOpening] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draftName, setDraftName] = useState(doc.name)

  async function handleOpen() {
    setIsOpening(true)
    setMessage(null)

    try {
      const { signedUrl } = await fetchApi(`/documents/${doc.id}/view`, token, {
        method: 'POST',
      })
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open document')
    } finally {
      setIsOpening(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${doc.name}?`)) return

    setIsOpening(true)
    setMessage(null)

    try {
      await fetchApi(`/documents/${doc.id}`, token, {
        method: 'DELETE',
      })
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete document')
    } finally {
      setIsOpening(false)
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!draftName.trim()) return

    setIsRenaming(true)
    setMessage(null)

    try {
      await fetchApi(`/documents/${doc.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ name: draftName.trim() }),
      })
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to rename document')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <div className="rs-document-actions">
      <button
        onClick={handleOpen}
        disabled={isOpening}
        className="rs-button rs-button-secondary rs-button-sm"
      >
        {isOpening ? 'Opening…' : 'Open'}
      </button>
      <form onSubmit={handleRename} className="rs-document-rename-form">
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="rs-form-input rs-form-input-sm"
        />
        <button
          type="submit"
          disabled={isRenaming || isOpening}
          className="rs-button rs-button-secondary rs-button-sm"
        >
          {isRenaming ? 'Saving…' : 'Rename'}
        </button>
      </form>
      <button
        onClick={handleDelete}
        disabled={isOpening || isRenaming}
        className="rs-button rs-button-danger rs-button-sm"
      >
        Delete
      </button>
      {message && <span className="rs-document-action-error">{message}</span>}
    </div>
  )
}
