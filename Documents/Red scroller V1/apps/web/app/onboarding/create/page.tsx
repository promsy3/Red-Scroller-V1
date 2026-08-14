"use client"
import { useActionState } from 'react';
import { createFirmAction } from '../actions';
import Link from 'next/link';

export default function CreateFirm() {
  const [state, formAction, isPending] = useActionState(createFirmAction, null);

  return (
    <div className="rs-onboarding-content">
      <div>
        <p className="rs-onboarding-eyebrow">Create your Firm</p>
        <h1>Start a new workspace</h1>
        <p className="rs-onboarding-subtitle">You'll be assigned as the first admin and can invite your team right away.</p>
      </div>

      <form action={formAction} className="rs-form-card">
        <div>
          <label className="rs-form-label">Firm Name</label>
          <input
            type="text"
            name="name"
            required
            className="rs-form-input"
            placeholder="E.g. Smith & Co. Law"
          />
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
            {isPending ? 'Creating...' : 'Create Firm'}
          </button>
        </div>
      </form>
    </div>
  );
}
