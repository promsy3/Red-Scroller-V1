"use client"

import { useState } from 'react'
import { fetchApi } from '@/utils/api'

export default function UploadDocumentForm({ matterId, token }: { matterId: string; token: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setMessage(null)

    try {
      const { signedUrl, storageKey } = await fetchApi('/documents/presign', token, {
        method: 'POST',
        body: JSON.stringify({ matterId, fileName: file.name }),
      })

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Upload to storage failed')
      }

      await fetchApi('/documents', token, {
        method: 'POST',
        body: JSON.stringify({
          matterId,
          name: file.name,
          storageKey,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        }),
      })

      setMessage('File uploaded successfully.')
      setFile(null)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) setFile(droppedFile)
  }

  return (
    <form onSubmit={handleSubmit} className={`rs-upload-form ${isDragging ? 'rs-upload-form-dragging' : ''}`}>
      <label className="rs-form-label" htmlFor="document-file">
        Upload document
      </label>
      <div 
        className={`rs-upload-dropzone ${isDragging ? 'rs-upload-dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="document-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="rs-upload-input"
        />
        {file ? (
          <p className="rs-upload-file-name">{file.name}</p>
        ) : (
          <p className="rs-upload-placeholder">
            Drag & drop a file here, or click to browse
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!file || isUploading}
        className="rs-button rs-button-primary"
      >
        {isUploading ? 'Uploading…' : 'Upload'}
      </button>
      {message && <p className="rs-upload-message">{message}</p>}
    </form>
  )
}
