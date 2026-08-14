"use server"
import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'

export async function createFirmAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) redirect('/login');

  try {
    await fetchApi('/firms', session.access_token, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  } catch (error: any) {
    return { error: error.message };
  }
  
  return redirect('/dashboard');
}

export async function joinFirmAction(firmId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login');

  try {
    await fetchApi(`/firms/${firmId}/join`, session.access_token, {
      method: 'POST'
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
