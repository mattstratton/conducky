import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../_app';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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

export default function RedeemInvitePage() {
  console.log('[INVITE PAGE] Component starting to render');
  const router = useRouter();
  const code = Array.isArray(router.query.code) ? router.query.code[0] : router.query.code;
  console.log('[INVITE PAGE] Code from router:', code);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, refreshUser } = useContext(UserContext) as any;
  console.log('[INVITE PAGE] User from context:', user ? user.email : 'null');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [redeeming, setRedeeming] = useState<boolean>(false);

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

  // Auto-redeem invite for authenticated users (e.g., after OAuth login)
  useEffect(() => {
    console.log('[AUTO-REDEEM DEBUG] useEffect triggered with:', {
      user: user ? `${user.email} (${user.id})` : 'null',
      invite: invite ? `${invite.id}` : 'null',
      event: event ? `${event.name} (${event.slug})` : 'null',
      success: success,
      error: error,
      redeeming: redeeming
    });

    if (user && invite && event && !success && !error && !redeeming) {
      console.log('[AUTO-REDEEM] 🔍 Auto-redemption triggered for authenticated user:', user.email);
      console.log('[AUTO-REDEEM] 🔍 About to call handleRedeem()');
      
      // Add a small delay to ensure all state has settled
      setTimeout(() => {
        console.log('[AUTO-REDEEM] 🔍 Executing handleRedeem() now');
        handleRedeem();
      }, 250);
    } else {
      console.log('[AUTO-REDEEM] ❌ Auto-redemption conditions not met:', {
        hasUser: !!user,
        hasInvite: !!invite,
        hasEvent: !!event,
        isSuccess: !!success,
        hasError: !!error,
        isRedeeming: !!redeeming
      });
    }
  }, [user, invite, event, success, error, redeeming]);

  // Handle redeem
  const handleRedeem = async () => {
    console.log('[REDEEM] Starting invite redemption for code:', code);
    setRedeeming(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/invites/${code}/redeem`, {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[REDEEM] Response status:', res.status);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log('[REDEEM] Error response:', data);
        throw new Error(data.error || 'Failed to redeem invite');
      }
      const data = await res.json();
      console.log('[REDEEM] Success response:', data);
      setSuccess('You have joined the event!');
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('[REDEEM] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to redeem invite');
    }
    setRedeeming(false);
  };

  // If not logged in, show login/register options
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Join {event?.name || 'Event'}</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              You need to sign in or create an account to join this event
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {invite && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-medium">Invitation Details:</div>
                {invite.note && (
                  <div><span className="font-medium">Note:</span> {invite.note}</div>
                )}
                {invite.expiresAt && (
                  <div><span className="font-medium">Expires:</span> {new Date(invite.expiresAt).toLocaleString()}</div>
                )}
                <div><span className="font-medium">Uses:</span> {invite.useCount}{invite.maxUses ? ` / ${invite.maxUses}` : ''}</div>
              </div>
            )}
            
            <div className="grid gap-3">
              <Button 
                onClick={() => router.push(`/login?next=${encodeURIComponent(`/invite/${code}`)}`)} 
                className="w-full"
              >
                Sign In
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => router.push(`/register?next=${encodeURIComponent(`/invite/${code}`)}`)} 
                className="w-full"
              >
                Create Account
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              By joining, you&apos;ll be added as a <strong>Reporter</strong> to {event?.name}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in - show redemption interface
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
      <Card className="w-full max-w-md shadow-lg">
        {loading ? (
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading invitation...</div>
          </CardContent>
        ) : error ? (
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-destructive font-medium mb-2">Invalid Invitation</div>
              <div className="text-sm text-muted-foreground mb-4">{error}</div>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Join {event?.name}</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                You&apos;re about to join as a Reporter
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {invite && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="font-medium">Invitation Details:</div>
                  {invite.note && (
                    <div><span className="font-medium">Note:</span> {invite.note}</div>
                  )}
                  {invite.expiresAt && (
                    <div><span className="font-medium">Expires:</span> {new Date(invite.expiresAt).toLocaleString()}</div>
                  )}
                  <div><span className="font-medium">Uses:</span> {invite.useCount}{invite.maxUses ? ` / ${invite.maxUses}` : ''}</div>
                  <div><span className="font-medium">Status:</span> {invite.disabled ? 'Disabled' : 'Active'}</div>
                </div>
              )}
              
              {success ? (
                <div className="text-center space-y-4">
                  <div className="text-green-600 font-semibold">{success}</div>
                  {event?.slug && (
                    <Button onClick={() => router.push(`/events/${event.slug}/dashboard`)} className="w-full">
                      Go to Event Dashboard
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleRedeem} 
                  disabled={redeeming || invite?.disabled} 
                  className="w-full"
                >
                  {redeeming ? 'Joining Event...' : 'Join Event'}
                </Button>
              )}
              
              {error && (
                <div className="text-destructive text-sm font-medium text-center bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
} 