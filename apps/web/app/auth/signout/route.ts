import { NextResponse } from 'next/server'

// Sign-out is handled client-side via Clerk's useClerk().signOut().
// This route is no longer used. Return 405 to prevent accidental usage.
export async function POST() {
  return NextResponse.json(
    { error: 'Sign-out is handled client-side via Clerk. This endpoint is not used.' },
    { status: 405 }
  )
}
