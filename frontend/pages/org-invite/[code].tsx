import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function OrganizationInvitePage() {
  const router = useRouter();
  const { code } = router.query as { code?: string };
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [inviteRole, setInviteRole] = useState<string>('');

  useEffect(() => {
    if (!code) return;

    const checkInviteAndUser = async () => {
      try {
        // Check user session first
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/session`,
          { credentials: 'include' }
        );

        if (!userRes.ok) {
          // Redirect to login with return URL
          router.push(`/login?redirect=${encodeURIComponent(`/org-invite/${code}`)}`);
          return;
        }

        const userData = await userRes.json();
        setUser(userData.user);

        // Auto-accept the invite
        setProcessing(true);
        const acceptRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/invite/${code}/use`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (acceptRes.ok) {
          const acceptData = await acceptRes.json();
          setOrganization(acceptData.organization);
          setInviteRole(acceptData.membership.role);
          setSuccess(true);
        } else {
          const errorData = await acceptRes.json();
          setError(errorData.error || 'Failed to accept invite');
        }
      } catch (err) {
        console.error('Error processing invite:', err);
        setError('An error occurred while processing the invite');
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    };

    checkInviteAndUser();
  }, [code, router]);

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'default' as const;
      case 'org_viewer':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading || processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {loading ? 'Loading invite...' : 'Joining organization...'}
            </h2>
            <p className="text-muted-foreground text-center">
              {loading ? 'Please wait while we verify your invite.' : 'Processing your membership...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Invite Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.back()} 
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success && organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Welcome to the team!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{organization.name}</span>
              </div>
              
              {organization.description && (
                <p className="text-sm text-muted-foreground">
                  {organization.description}
                </p>
              )}
              
              <div className="flex items-center justify-center space-x-2">
                <span className="text-sm text-muted-foreground">Your role:</span>
                <Badge variant={getRoleBadgeVariant(inviteRole)}>
                  {formatRoleName(inviteRole)}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                You have successfully joined {organization.name} as {user?.name || user?.email}.
              </p>
            </div>
            
            <div className="mt-6 space-y-2">
              <Button 
                onClick={() => router.push(`/orgs/${organization.slug}`)} 
                className="w-full"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Go to Organization
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 