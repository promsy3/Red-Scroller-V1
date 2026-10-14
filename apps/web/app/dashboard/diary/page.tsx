import { auth } from '@clerk/nextjs/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import CreateEventForm from './CreateEventForm'
import DiaryEventList from './DiaryEventList'

export default async function DiaryPage() {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/login')
  const token = await getToken()
  if (!token) redirect('/login')

  let events = []
  let matters = []
  try {
    events = await fetchApi('/diary', token)
    matters = await fetchApi('/matters', token)
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="rs-diary-page">
      <div className="rs-diary-header">
        <div>
          <p className="rs-diary-eyebrow">Firm workspace</p>
          <h1 className="rs-diary-title">Diary</h1>
          <p className="rs-diary-subtitle">Keep deadlines, hearings, and client meetings in one secure schedule.</p>
        </div>
        <CreateEventForm matters={matters} token={token} />
      </div>
      <DiaryEventList events={events} matters={matters} token={token} />
    </div>
  )
}
