"use server"
import { auth } from '@clerk/nextjs/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'

export async function createFirmAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };

  const { userId, getToken } = await auth()
  if (!userId) redirect('/login');
  const token = await getToken()
  if (!token) redirect('/login');

  try {
    await fetchApi('/firms', token, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  } catch (error: any) {
    return { error: error.message };
  }
  
  return redirect('/dashboard');
}

export async function createSoloFirmAction(prevState: any, formData: FormData) {
  const workspaceName = formData.get('workspaceName') as string;
  if (!workspaceName) return { error: 'Workspace name is required' };

  const { userId, getToken } = await auth()
  if (!userId) redirect('/login');
  const token = await getToken()
  if (!token) redirect('/login');

  try {
    await fetchApi('/firms', token, {
      method: 'POST',
      body: JSON.stringify({ name: workspaceName })
    });
  } catch (error: any) {
    return { error: error.message };
  }
  
  return redirect('/dashboard');
}

export async function joinFirmAction(firmId: string) {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/login');
  const token = await getToken()
  if (!token) redirect('/login');

  try {
    await fetchApi(`/firms/${firmId}/join`, token, {
      method: 'POST'
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
