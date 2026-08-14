import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import CreateEventForm from './CreateEventForm'
import DiaryEventList from './DiaryEventList'

export default async function DiaryPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let events = []
  let matters = []
  try {
    events = await fetchApi('/diary', session.access_token)
    matters = await fetchApi('/matters', session.access_token)
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
        <CreateEventForm matters={matters} token={session.access_token} />
      </div>
      <DiaryEventList events={events} matters={matters} token={session.access_token} />
    </div>
  )
}
