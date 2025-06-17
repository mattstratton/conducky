import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../_app';
import { UserRegistrationForm } from '../../components/UserRegistrationForm';

interface Invite {
  id: string;
  note?: string;
  expiresAt?: string;
  useCount: number;
  maxUses?: number;
  disabled: boolean;
}

interface Event {
  id: string;
  name: string;
  slug: string;
}

interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
}

export default function RedeemInvitePage() {
  const router = useRouter();
  const { code } = router.query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, refreshUser } = useContext(UserContext) as any;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [redeeming, setRedeeming] = useState<boolean>(false);
  // Registration form state
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string>('');

  // Fetch invite link details
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/invites/${code}`)
      .then(res => res.ok ? res.json() : Promise.reject('Invite not found'))
      .then(data => {
        setInvite(data.invite);
        setEvent(data.event);
      })
      .catch(() => setError('Invite link not found or invalid.'))
      .finally(() => setLoading(false));
  }, [code]);

  // Handle redeem
  const handleRedeem = async () => {
    setRedeeming(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/invites/${code}/redeem`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to redeem invite');
      }
      setSuccess('You have joined the event!');
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeem invite');
    }
    setRedeeming(false);
  };

  // If not logged in, show login/register form
  if (!user && !loading) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 border rounded">
        <h2 className="text-xl font-semibold mb-4">Join Event: {event?.name || '...'}</h2>
        <p className="mb-4">You must be logged in or register to redeem this invite link.</p>
        <div className="flex flex-col gap-6">
          <a href={`/login?next=/invite/${code}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center">Sign In (Existing Users)</a>
          {success ? (
            <div className="text-green-700 font-semibold mt-4">
              {success}
              <div className="mt-4">
                <a href={`/login?next=/invite/${code}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to Login</a>
              </div>
            </div>
          ) : (
            <UserRegistrationForm
              buttonText="Register & Join Event"
              loading={regLoading}
              error={regError}
              success={success}
              onSubmit={async ({ name, email, password }: UserRegistrationData) => {
                setRegError('');
                setRegLoading(true);
                try {
                  const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/auth/register/invite/${code}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Registration failed');
                  setSuccess('Registration successful! Please log in to continue.');
                } catch (err) {
                  setRegError(err instanceof Error ? err.message : 'Registration failed');
                }
                setRegLoading(false);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 border rounded">
      {loading ? <div className="text-muted-foreground">Loading...</div> : error ? <div className="text-destructive">{error}</div> : (
        <>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Join Event: {event?.name || '...'}</h2>
          <div className="mb-2 text-muted-foreground">You are about to join as a <b>Reporter</b>.</div>
          {invite && (
            <div className="mb-4 text-sm text-muted-foreground">
              <div><b>Invite Note:</b> {invite.note || '—'}</div>
              <div><b>Expires:</b> {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : '—'}</div>
              <div><b>Uses:</b> {invite.useCount}{invite.maxUses ? ` / ${invite.maxUses}` : ''}</div>
              <div><b>Status:</b> {invite.disabled ? 'Disabled' : 'Active'}</div>
            </div>
          )}
          {success ? (
            <div className="text-green-600 font-semibold mb-2">{success}
              {event?.slug && (
                <div className="mt-4">
                  <a href={`/events/${event.slug}/dashboard`} className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">Go to Event</a>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleRedeem} disabled={redeeming || invite?.disabled} className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50">
              {redeeming ? 'Joining...' : 'Join Event'}
            </button>
          )}
          {error && <div className="text-destructive mt-2">{error}</div>}
        </>
      )}
    </div>
  );
} 