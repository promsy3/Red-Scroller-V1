"use client"
import { useActionState } from 'react';
import { createSoloFirmAction } from '../actions';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function SoloFirm() {
  const { user } = useUser();
  const [state, formAction, isPending] = useActionState(createSoloFirmAction, null);
  
  // Auto-generate a workspace name from user's email
  const suggestedName = user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'My Practice';

  return (
    <div className="rs-onboarding-content">
      <div>
        <p className="rs-onboarding-eyebrow">Solo Workspace</p>
        <h1>Set up your practice</h1>
        <p className="rs-onboarding-subtitle">Create a simplified workspace just for yourself. Skip team setup and start managing your practice immediately.</p>
      </div>

      <form action={formAction} className="rs-form-card">
        <div>
          <label className="rs-form-label">Workspace Name</label>
          <input
            type="text"
            name="workspaceName"
            required
            className="rs-form-input"
            placeholder={suggestedName}
            defaultValue={suggestedName}
          />
          <p className="rs-form-hint">This will be your firm name. You can change it later.</p>
        </div>

        {state?.error && (
          <div className="rs-form-error">{state.error}</div>
        )}

        <div className="rs-form-actions">
          <Link href="/onboarding" className="rs-button rs-button-secondary">Back</Link>
          <button
            type="submit"
            disabled={isPending}
            className="rs-button rs-button-primary"
          >
            {isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
