import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../_app';
import { UserRegistrationForm } from '../../components/UserRegistrationForm';
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

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

  // Handle social login
  const handleSocialLogin = (provider: 'google' | 'github') => {
    // Redirect to OAuth provider with invite code as state parameter
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const redirectUrl = `${baseUrl}/api/auth/${provider}`;
    
    // Pass the invite URL as state parameter that will be preserved through OAuth flow
    const inviteUrl = `/invite/${code}`;
    const encodedInviteUrl = encodeURIComponent(inviteUrl);
    window.location.href = `${redirectUrl}?state=${encodedInviteUrl}`;
  };

  // If not logged in, show login/register form
  if (!user && !loading) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 border rounded">
        <h2 className="text-xl font-semibold mb-4">Join Event: {event?.name || '...'}</h2>
        <p className="mb-4">You must be logged in or register to redeem this invite link.</p>
        <div className="flex flex-col gap-6">
          <a href={`/login?next=/invite/${code}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center">Sign In (Existing Users)</a>
          
          {/* Social Login Options */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('github')}
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </div>
          </div>

          {/* Traditional Registration Form */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or register with email</span>
            </div>
          </div>

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