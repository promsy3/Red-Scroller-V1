"use server"
import { auth } from '@clerk/nextjs/server'
import { fetchApi } from '@/utils/api'
import { revalidatePath } from 'next/cache'

export async function approveRequestAction(requestId: string) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Not authenticated' }
  const token = await getToken()
  if (!token) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/requests/${requestId}/approve`, token, {
      method: 'POST'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function declineRequestAction(requestId: string) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Not authenticated' }
  const token = await getToken()
  if (!token) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/requests/${requestId}/decline`, token, {
      method: 'POST'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function removeMemberAction(firmId: string, userId: string) {
  const { userId: actorId, getToken } = await auth()
  if (!actorId) return { error: 'Not authenticated' }
  const token = await getToken()
  if (!token) return { error: 'Not authenticated' }

  try {
    await fetchApi(`/firms/${firmId}/members/${userId}`, token, {
      method: 'DELETE'
    });
    revalidatePath('/dashboard/team')
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
