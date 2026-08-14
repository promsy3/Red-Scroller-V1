"use server"
import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { revalidatePath } from 'next/cache'

export async function approveRequestAction(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/requests/${requestId}/approve`, session.access_token, {
      method: 'POST'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function declineRequestAction(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/requests/${requestId}/decline`, session.access_token, {
      method: 'POST'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function removeMemberAction(firmId: string, userId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/${firmId}/members/${userId}`, session.access_token, {
      method: 'DELETE'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
