import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchApi } from '@/utils/api'

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  const token = await getToken()
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const body = await fetchApi('/audit/export', token)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="audit-logs.csv"',
      },
    })
  } catch (error) {
    return NextResponse.json({ message: 'Unable to export audit logs' }, { status: 500 })
  }
}
