import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from '../_app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface OrganizationInvite {
  id: string;
  note?: string;
  expiresAt?: string;
  useCount: number;
  maxUses?: number;
  disabled: boolean;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function OrganizationInvitePage() {
  const router = useRouter();
  const code = Array.isArray(router.query.code) ? router.query.code[0] : router.query.code;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, refreshUser } = useContext(UserContext) as any;
  
  const [invite, setInvite] = useState<OrganizationInvite | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [redeeming, setRedeeming] = useState(false);

  // Fetch invite details
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/invite/${code}`)
      .then(res => res.ok ? res.json() : Promise.reject('Invite not found'))
      .then(data => {
        setInvite(data.invite);
        setOrganization(data.organization);
      })
      .catch(() => setError('Organization invite link not found or invalid.'))
      .finally(() => setLoading(false));
  }, [code]);

  // Auto-redeem invite for authenticated users
  useEffect(() => {
    if (user && invite && organization && !success && !error && !redeeming) {
      // Add a small delay to ensure all state has settled
      setTimeout(() => {
        handleRedeem();
      }, 250);
    }
  }, [user, invite, organization, success, error, redeeming]);

  // Handle redeem
  const handleRedeem = async () => {
    setRedeeming(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/invite/${code}/use`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join organization');
      }
      await res.json();
      setSuccess('You have joined the organization!');
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join organization');
    }
    setRedeeming(false);
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'Organization Admin';
      case 'org_viewer':
        return 'Organization Viewer';
      default:
        return role;
    }
  };



  // If not logged in, show login/register options
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Join {organization?.name || 'Organization'}</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              You need to sign in or create an account to join this organization
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
                <div><span className="font-medium">Role:</span> {formatRoleName(invite.role)}</div>
              </div>
            )}
            
            <div className="grid gap-3">
              <Button 
                onClick={() => router.push(`/login?next=${encodeURIComponent(`/org-invite/${code}`)}`)} 
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
                onClick={() => router.push(`/register?next=${encodeURIComponent(`/org-invite/${code}`)}`)} 
                className="w-full"
              >
                Create Account
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              By joining, you&apos;ll be added as a <strong>{formatRoleName(invite?.role || 'org_viewer')}</strong> to {organization?.name}
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
              <CardTitle className="text-2xl text-center">Join {organization?.name}</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                You&apos;re about to join as a {formatRoleName(invite?.role || 'org_viewer')}
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
                  <div><span className="font-medium">Role:</span> {formatRoleName(invite.role)}</div>
                </div>
              )}
              
              {success ? (
                <div className="text-center space-y-4">
                  <div className="text-green-600 font-semibold">{success}</div>
                  {organization?.slug && (
                    <Button onClick={() => router.push(`/orgs/${organization.slug}`)} className="w-full">
                      Go to Organization
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleRedeem} 
                  disabled={redeeming || invite?.disabled} 
                  className="w-full"
                >
                  {redeeming ? 'Joining Organization...' : 'Join Organization'}
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